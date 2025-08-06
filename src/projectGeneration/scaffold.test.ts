import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as templatesModule from "./templates";
import * as notifications from "../notifications";
import * as telemetry from "../telemetry/events";
import { ScaffoldV1Template } from "../clients/scaffoldingService";
import { scaffoldProjectRequest } from "./scaffold";
import { WebviewPanelCache } from "../webview-cache";

const TEMPLATE: ScaffoldV1Template = {
  spec: {
    name: "tmpl",
    display_name: "Template",
    template_collection: { id: "col" },
    options: {},
  },
} as any;

describe("scaffoldProjectRequest", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(telemetry, "logUsage");
    sandbox.stub(vscode.window, "showErrorMessage");
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("returns failure when listing templates fails", async () => {
    sandbox.stub(templatesModule, "getTemplatesList").rejects(new Error("boom"));
    const res = await scaffoldProjectRequest();
    assert.deepStrictEqual(res, {
      success: false,
      message: "Failed to retrieve template list",
    });
  });

  it("returns cancel message when no template picked", async () => {
    sandbox.stub(templatesModule, "getTemplatesList").resolves([TEMPLATE]);
    sandbox.stub(templatesModule, "pickTemplate").resolves(undefined);
    const res = await scaffoldProjectRequest();
    assert.deepStrictEqual(res, {
      success: false,
      message: "Project generation cancelled.",
    });
  });

  it("errors when named template not found", async () => {
    sandbox.stub(templatesModule, "getTemplatesList").resolves([]);
    const errStub = sandbox.stub(notifications, "showErrorNotificationWithButtons");
    const res = await scaffoldProjectRequest({
      templateCollection: "col",
      templateName: "missing",
    });
    sinon.assert.calledOnce(errStub);
    assert.deepStrictEqual(res, {
      success: false,
      message:
        "Project template not found. Check the template name and collection and try again.",
    });
  });

  it("reuses existing webview if already open", async () => {
    sandbox.stub(templatesModule, "getTemplatesList").resolves([TEMPLATE]);
    sandbox.stub(templatesModule, "pickTemplate").resolves(TEMPLATE);
    const reveal = sandbox.spy();
    sandbox
      .stub(WebviewPanelCache.prototype, "findOrCreate")
      .returns([{ reveal } as any, true]);
    const res = await scaffoldProjectRequest();
    assert.strictEqual(reveal.calledOnce, true);
    assert.deepStrictEqual(res, { success: true, message: "Form already open" });
  });
});
