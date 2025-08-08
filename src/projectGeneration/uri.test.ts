import * as sinon from "sinon";
import * as vscode from "vscode";
import * as scaffoldModule from "./scaffold";
import * as applyModule from "./applyTemplate";
import * as notifications from "../notifications";
import * as telemetry from "../telemetry/events";
import { handleProjectScaffoldUri, setProjectScaffoldListener } from "./uri";
import { projectScaffoldUri } from "../emitters";

describe("project generation URI handling", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(telemetry, "logUsage");
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("shows error when required params missing", async () => {
    const stub = sandbox.stub(vscode.window, "showErrorMessage");
    await handleProjectScaffoldUri(null, null, null, {});
    sinon.assert.calledOnce(stub);
  });

  it("invokes scaffoldProjectRequest when form needed", async () => {
    sandbox
      .stub(vscode.window, "withProgress")
      .callsFake(async (_o, task) => task());
    const scaffoldStub = sandbox
      .stub(scaffoldModule, "scaffoldProjectRequest")
      .resolves({ success: true, message: "ok" });
    const applyStub = sandbox.stub(applyModule, "applyTemplate");
    await handleProjectScaffoldUri("col", "tmpl", true, { foo: "bar" });
    sinon.assert.calledOnceWithExactly(
      scaffoldStub,
      { templateCollection: "col", templateName: "tmpl", foo: "bar" },
      "uri",
    );
    sinon.assert.notCalled(applyStub);
  });

  it("falls back to form when applyTemplate fails", async () => {
    sandbox
      .stub(vscode.window, "withProgress")
      .callsFake(async (_o, task) => task());
    sandbox
      .stub(applyModule, "applyTemplate")
      .resolves({ success: false, message: "err" });
    const scaffoldStub = sandbox
      .stub(scaffoldModule, "scaffoldProjectRequest")
      .resolves({ success: true, message: "ok" });
    const errorStub = sandbox.stub(notifications, "showErrorNotificationWithButtons");
    await handleProjectScaffoldUri("col", "tmpl", false, {});
    sinon.assert.calledOnce(errorStub);
    sinon.assert.calledOnce(scaffoldStub);
  });

  it("setProjectScaffoldListener parses URI and forwards to handler", async () => {
    const handleStub = sandbox
      .stub(require("./uri"), "handleProjectScaffoldUri")
      .resolves();
    sandbox.stub(projectScaffoldUri, "event").callsFake((listener: any) => {
      listener(vscode.Uri.parse("test://host?collection=c&template=t&isFormNeeded=true&x=1"));
      return { dispose() {} } as any;
    });
    const disp = setProjectScaffoldListener();
    sinon.assert.calledOnce(handleStub);
    sinon.assert.calledWithExactly(handleStub, "c", "t", true, { x: "1" });
    disp.dispose();
  });
});
