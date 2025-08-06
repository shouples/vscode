import { Disposable } from "vscode";
import { registerCommandWithLogging } from ".";
import { FlinkArtifactsViewProvider } from "../viewProviders/flinkArtifacts";

export function registerFlinkArtifactCommands(): Disposable[] {
  return [
    registerCommandWithLogging("confluent.flink.artifacts.mode.artifacts", async () => {
      const view = FlinkArtifactsViewProvider.getInstance();
      await view.switchToArtifacts();
    }),
    registerCommandWithLogging("confluent.flink.artifacts.mode.udfs", async () => {
      const view = FlinkArtifactsViewProvider.getInstance();
      await view.switchToUdfs();
    }),
  ];
}
