import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { ScaffoldV1Template } from "../clients/scaffoldingService";
import * as fileModule from "../utils/file";
import { parseErrorMessage, getNonConflictingDirPath } from "./applyTemplate";

describe("applyTemplate utilities", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe("parseErrorMessage", () => {
    it("formats error messages from API payload", () => {
      const raw = JSON.stringify({
        errors: [
          { detail: "bad", source: { pointer: "/options/foo" } },
          { detail: "also bad", source: { pointer: "/options/bar" } },
        ],
      });
      const formatted = parseErrorMessage(raw);
      assert.strictEqual(
        formatted,
        "Invalid format for option 'foo': bad\nInvalid format for option 'bar': also bad",
      );
    });

    it("returns raw message when parsing fails", () => {
      const raw = "not json";
      const formatted = parseErrorMessage(raw);
      assert.strictEqual(formatted, raw);
    });
  });

  describe("getNonConflictingDirPath", () => {
    const template = { spec: { name: "app" } } as ScaffoldV1Template;

    it("uses template name when no conflict", async () => {
      sandbox.stub(fileModule, "fileUriExists").resolves(false);
      const dest = await getNonConflictingDirPath(vscode.Uri.file("/tmp"), template);
      assert.strictEqual(dest.path, "/tmp/app");
    });

    it("appends random suffix when directory exists", async () => {
      sandbox.stub(fileModule, "fileUriExists").resolves(true);
      sandbox.stub(Math, "random").returns(0.123456);
      const dest = await getNonConflictingDirPath(vscode.Uri.file("/tmp"), template);
      assert.ok(dest.path.startsWith("/tmp/app-"));
    });
  });
});
