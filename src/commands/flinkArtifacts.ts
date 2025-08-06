import * as vscode from "vscode";
import { registerCommandWithLogging } from ".";
import { FlinkArtifactsViewProvider } from "../viewProviders/flinkArtifacts";

export async function viewUdfMode(): Promise<void> {
  const provider = FlinkArtifactsViewProvider.getInstance();
  await provider.setMode("udfs");
}

export async function viewArtifactMode(): Promise<void> {
  const provider = FlinkArtifactsViewProvider.getInstance();
  await provider.setMode("artifacts");
}

export function registerFlinkArtifactsCommands(): vscode.Disposable[] {
  return [
    registerCommandWithLogging("confluent.artifacts.view-mode.udfs", viewUdfMode),
    registerCommandWithLogging("confluent.artifacts.view-mode.artifacts", viewArtifactMode),
  ];
}
