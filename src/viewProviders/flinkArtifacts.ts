import { TreeDataProvider, TreeItem } from "vscode";
import { ContextValues, setContextValue } from "../context/values";
import { currentFlinkArtifactsPoolChanged } from "../emitters";
import { isResponseError, logError } from "../errors";
import { CCloudResourceLoader } from "../loaders";
import { FlinkArtifact, FlinkArtifactTreeItem } from "../models/flinkArtifact";
import { FlinkUdf, FlinkUdfTreeItem } from "../models/flinkUdf";
import { CCloudFlinkComputePool } from "../models/flinkComputePool";
import { showErrorNotificationWithButtons } from "../notifications";
import { MultiModeViewProvider } from "./base";

export class FlinkArtifactsViewProvider
  extends MultiModeViewProvider<
    CCloudFlinkComputePool,
    FlinkArtifact | FlinkUdf
  >
  implements TreeDataProvider<FlinkArtifact | FlinkUdf>
{
  readonly kind = "flinkArtifacts";
  loggerName = "viewProviders.flinkArtifacts";
  viewId = "confluent-flink-artifacts";

  parentResourceChangedEmitter = currentFlinkArtifactsPoolChanged;
  parentResourceChangedContextValue = ContextValues.flinkArtifactsPoolSelected;
  modeContextValue = ContextValues.flinkArtifactsMode;
  protected defaultMode = "artifacts";

  private _artifacts: FlinkArtifact[] = [];
  private _udfs: FlinkUdf[] = [];

  constructor() {
    super();
    this.currentMode = this.defaultMode;
    if (this.modeContextValue) {
      void setContextValue(this.modeContextValue, this.currentMode);
    }
    this.registerMode("artifacts", {
      getChildren: this.getArtifactChildren.bind(this),
      getTreeItem: (element: FlinkArtifact | FlinkUdf) =>
        this.getArtifactTreeItem(element as FlinkArtifact),
      refresh: this.refreshArtifacts.bind(this),
    });
    this.registerMode("udfs", {
      getChildren: this.getUdfChildren.bind(this),
      getTreeItem: (element: FlinkArtifact | FlinkUdf) =>
        this.getUdfTreeItem(element as FlinkUdf),
      refresh: this.refreshUdfs.bind(this),
    });
  }

  private getArtifactChildren(element?: FlinkArtifact): FlinkArtifact[] {
    if (!this.computePool) {
      return [];
    }
    return this.filterChildren(element, this._artifacts) as FlinkArtifact[];
  }

  private async refreshArtifacts(): Promise<void> {
    this._artifacts = [];

    if (this.computePool) {
      this._onDidChangeTreeData.fire();

      await this.withProgress(
        "Loading Flink artifacts...",
        async () => {
          try {
            const loader = CCloudResourceLoader.getInstance();
            this._artifacts = await loader.getFlinkArtifacts(this.computePool!);
          } catch (error) {
            const { showNotification, message } = triageGetFlinkArtifactsError(error, this.logger);
            if (showNotification) {
              void showErrorNotificationWithButtons(message);
            }
            throw error;
          }
        },
        false,
      );
    }

    this._onDidChangeTreeData.fire();
  }

  private getArtifactTreeItem(element: FlinkArtifact): TreeItem {
    return new FlinkArtifactTreeItem(element);
  }

  private getUdfChildren(element?: FlinkUdf): FlinkUdf[] {
    if (!this.computePool) {
      return [];
    }
    return this.filterChildren(element, this._udfs);
  }

  private async refreshUdfs(): Promise<void> {
    this._udfs = [];

    if (this.computePool) {
      this._onDidChangeTreeData.fire();
      // TODO: load UDFs when API is available
    }

    this._onDidChangeTreeData.fire();
  }

  private getUdfTreeItem(element: FlinkUdf): TreeItem {
    return new FlinkUdfTreeItem(element);
  }

  get computePool(): CCloudFlinkComputePool | null {
    return this.resource;
  }
}

export function triageGetFlinkArtifactsError(
  error: unknown,
  logger: { debug: (msg: string, err: unknown) => void },
): {
  showNotification: boolean;
  message: string;
} {
  let showNotification = false;
  let message = "Failed to load Flink artifacts.";

  if (isResponseError(error)) {
    const status = error.response.status;
    error.response
      .clone()
      .json()
      .catch((err) => {
        logger.debug("Failed to parse error response as JSON", err);
      });
    /* Note: This switch statement intentionally excludes 400 errors.
     Otherwise, they may pop up on loading the compute pool if it is using an unsupported cloud provider. */
    if (status >= 401 && status < 600) {
      showNotification = true;
      switch (status) {
        case 401:
          message = "Authentication required to load Flink artifacts.";
          break;
        case 403:
          message = "Failed to load Flink artifacts. Please check your permissions and try again.";
          break;
        case 404:
          message = "Flink artifacts not found for this compute pool.";
          break;
        case 429:
          message = "Too many requests. Please try again later.";
          break;
        case 503:
          message =
            "Failed to load Flink artifacts. The service is temporarily unavailable. Please try again later.";
          break;
        default:
          message = "Failed to load Flink artifacts due to an unexpected error.";
          break;
      }
    }
    logError(error, "Failed to load Flink artifacts");
  } else {
    message = "Failed to load Flink artifacts. Please check your connection and try again.";
    showNotification = true;
    logError(error, "Failed to load Flink artifacts");
  }

  return { showNotification, message };
}
