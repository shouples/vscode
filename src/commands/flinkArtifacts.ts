import * as vscode from "vscode";
import { registerCommandWithLogging } from ".";
import { FlinkArtifactsViewProvider } from "../viewProviders/flinkArtifacts";

function switchMode(mode: string): void {
  FlinkArtifactsViewProvider.getInstance().switchMode(mode);
}

export function registerFlinkArtifactCommands(): vscode.Disposable[] {
  return [
    registerCommandWithLogging("confluent.artifacts.viewArtifacts", () =>
      switchMode("artifacts"),
    ),
    registerCommandWithLogging("confluent.artifacts.viewUDFs", () =>
      switchMode("udfs"),
    ),
  ];
}
