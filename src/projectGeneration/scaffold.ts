import * as vscode from "vscode";
import { ViewColumn } from "vscode";

import { ScaffoldV1Template, ScaffoldV1TemplateSpec } from "../clients/scaffoldingService";
import { logError } from "../errors";
import { Logger } from "../logging";
import { showErrorNotificationWithButtons } from "../notifications";
import { getTemplatesList, pickTemplate } from "./templates";
import { UserEvent, logUsage } from "../telemetry/events";
import { WebviewPanelCache } from "../webview-cache";
import { handleWebviewMessage } from "../webview/comms/comms";
import { PostResponse, type post } from "../webview/scaffold-form";
import scaffoldFormTemplate from "../webview/scaffold-form.html";
import { applyTemplate } from "./applyTemplate";

type MessageSender = OverloadUnion<typeof post>;
type MessageResponse<MessageType extends string> = Awaited<
  ReturnType<Extract<MessageSender, (type: MessageType, body: any) => any>>
>;

interface PrefilledTemplateOptions {
  templateCollection?: string;
  templateName?: string;
  templateType?: string;
  [key: string]: string | undefined;
}

const logger = new Logger("scaffold");

const scaffoldWebviewCache = new WebviewPanelCache();

export const scaffoldProjectRequest = async (
  templateRequestOptions?: PrefilledTemplateOptions,
  telemetrySource?: string,
): Promise<PostResponse> => {
  let pickedTemplate: ScaffoldV1Template | undefined = undefined;
  const templateType = templateRequestOptions?.templateType;
  try {
    // should only be using a templateCollection if this came from a URI; by default all other uses
    // will default to the "vscode" collection
    let templateList: ScaffoldV1Template[] = await getTemplatesList(
      templateRequestOptions?.templateCollection,
    );
    if (templateRequestOptions && !templateRequestOptions.templateName) {
      // When we're triggering the scaffolding from the cluster or topic context menu, we want to show only
      // templates that are tagged as producer or consumer but with a quickpick
      templateList = templateList.filter((template) => {
        const tags = template.spec?.tags || [];

        if (templateType === "flink") {
          return tags.includes("apache flink") || tags.includes("table api");
        } else if (templateType === "kafka") {
          return tags.includes("producer") || tags.includes("consumer");
        }

        // If no specific type, show all templates with producer or consumer tags
        return tags.includes("producer") || tags.includes("consumer");
      });

      pickedTemplate = await pickTemplate(templateList);
    } else if (templateRequestOptions && templateRequestOptions.templateName) {
      // Handling from a URI (or Copilot tool invocation) where there is a template name matched and
      // showing a quickpick is not needed
      pickedTemplate = templateList.find(
        (template) => template.spec!.name === templateRequestOptions.templateName,
      );
      if (!pickedTemplate) {
        const errMsg =
          "Project template not found. Check the template name and collection and try again.";
        logError(new Error(errMsg), "template not found", {
          extra: {
            templateName: templateRequestOptions.templateName,
            templateCollection: templateRequestOptions.templateCollection,
          },
        });
        showErrorNotificationWithButtons(errMsg);
        return { success: false, message: errMsg };
      }
    } else {
      // If no arguments are passed, show all templates
      pickedTemplate = await pickTemplate(templateList);
    }
  } catch (err) {
    logError(err, "template listing", { extra: { functionName: "scaffoldProjectRequest" } });
    vscode.window.showErrorMessage("Failed to retrieve template list");
    return { success: false, message: "Failed to retrieve template list" };
  }

  if (!pickedTemplate) {
    // user canceled the quickpick
    return { success: false, message: "Project generation cancelled." };
  }

  logUsage(UserEvent.ProjectScaffoldingAction, {
    status: "template picked",
    templateCollection: pickedTemplate.spec!.template_collection?.id,
    templateId: pickedTemplate.spec!.name,
    templateName: pickedTemplate.spec!.display_name,
    itemType: telemetrySource,
  });

  const templateSpec: ScaffoldV1TemplateSpec = pickedTemplate.spec!;

  const [optionsForm, wasExisting] = scaffoldWebviewCache.findOrCreate(
    { id: templateSpec.name!, template: scaffoldFormTemplate },
    "template-options-form",
    `Generate ${templateSpec.display_name} Template`,
    ViewColumn.One,
    { enableScripts: true },
  );

  if (wasExisting) {
    optionsForm.reveal();
    return { success: true, message: "Form already open" };
  }

  /** Stores a map of options with key: value pairs that is then updated on form input
   * This keeps a sort of "state" so that users don't lose inputs when the form goes in the background
   * It also initializes the options with either the initial values or known values from the item
   */
  let optionValues: { [key: string]: string | boolean } = {};
  let options = templateSpec.options || {};

  for (const [option, properties] of Object.entries(options)) {
    if (templateRequestOptions && templateRequestOptions[option] !== undefined) {
      let value: string | boolean;
      const optionValue = templateRequestOptions[option];

      // Handle boolean string values
      if (optionValue === "true" || optionValue === "false") {
        value = optionValue === "true";
      } else {
        // Handle regular string values, with undefined check
        value = optionValue || "";
      }
      optionValues[option] = value;
      properties.initial_value = typeof value === "boolean" ? value.toString() : value;
    } else {
      optionValues[option] = properties.initial_value ?? "";
    }
  }

  function updateOptionValue(key: string, value: string) {
    optionValues[key] = value;
  }

  const processMessage = async (...[type, body]: Parameters<MessageSender>) => {
    switch (type) {
      case "GetTemplateSpec": {
        const spec = pickedTemplate?.spec ?? null;
        return spec satisfies MessageResponse<"GetTemplateSpec">;
      }
      case "GetOptionValues": {
        return optionValues satisfies MessageResponse<"GetOptionValues">;
      }
      case "SetOptionValue": {
        const { key, value } = body;
        updateOptionValue(key, value);
        return null satisfies MessageResponse<"SetOptionValue">;
      }
      case "Submit": {
        logUsage(UserEvent.ProjectScaffoldingAction, {
          status: "form submitted",
          templateCollection: templateSpec.template_collection?.id,
          templateId: templateSpec.name,
          templateName: templateSpec.display_name,
          itemType: telemetrySource,
        });
        let res: PostResponse = { success: false, message: "Failed to apply template." };
        if (pickedTemplate) {
          res = await applyTemplate(pickedTemplate, body.data, telemetrySource);
          // only dispose the form if the template was successfully applied
          if (res.success) optionsForm.dispose();
        } else vscode.window.showErrorMessage("Failed to apply template.");
        return res satisfies MessageResponse<"Submit">;
      }
    }
  };
  const disposable = handleWebviewMessage(optionsForm.webview, processMessage);
  optionsForm.onDidDispose(() => disposable.dispose());

  return { success: true, message: "Form opened" };
};

