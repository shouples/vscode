import { TreeDataProvider, TreeItem } from "vscode";
import { ContextValues, setContextValue } from "../context/values";
import { currentFlinkArtifactsPoolChanged } from "../emitters";
import { isResponseError, logError } from "../errors";
import { CCloudResourceLoader } from "../loaders";
import { FlinkArtifact, FlinkArtifactTreeItem } from "../models/flinkArtifact";
import { CCloudFlinkComputePool } from "../models/flinkComputePool";
import { FlinkUdf, FlinkUdfTreeItem } from "../models/flinkUdf";
import { showErrorNotificationWithButtons } from "../notifications";
import { MultiModeViewProvider, ViewModeDelegate } from "./base";

export enum FlinkArtifactsViewMode {
  Artifacts = "artifacts",
  Udfs = "udfs",
}

class FlinkArtifactsMode implements ViewModeDelegate<CCloudFlinkComputePool, any> {
  private artifacts: FlinkArtifact[] = [];
  constructor(private provider: FlinkArtifactsViewProvider) {}

  async refresh(): Promise<void> {
    this.artifacts = [];
    if (this.provider.computePool) {
      this.provider.fireTreeDataChanged();
      await this.provider.withProgress(
        "Loading Flink artifacts...",
        async () => {
          try {
            const loader = CCloudResourceLoader.getInstance();
            this.artifacts = await loader.getFlinkArtifacts(this.provider.computePool!);
          } catch (error) {
            const { showNotification, message } = triageGetFlinkArtifactsError(
              error,
              this.provider.logger,
            );
            if (showNotification) {
              void showErrorNotificationWithButtons(message);
            }
            throw error;
          }
        },
        false,
      );
    }
    this.provider.fireTreeDataChanged();
  }

  getChildren(element?: FlinkArtifact): FlinkArtifact[] {
    if (!this.provider.computePool) {
      return [];
    }
    return this.provider.filterChildren(element, this.artifacts);
  }

  getTreeItem(element: FlinkArtifact): TreeItem {
    return new FlinkArtifactTreeItem(element);
  }

  setParentResource(): void {
    // no-op; provider manages resource state
  }
}

class FlinkUdfMode implements ViewModeDelegate<CCloudFlinkComputePool, any> {
  private udfs: FlinkUdf[] = [];
  constructor(private provider: FlinkArtifactsViewProvider) {}

  async refresh(): Promise<void> {
    this.udfs = [];
    if (this.provider.computePool) {
      this.provider.fireTreeDataChanged();
      // TODO: load UDFs when API is available
      this.provider.fireTreeDataChanged();
    } else {
      this.provider.fireTreeDataChanged();
    }
  }

  getChildren(element?: FlinkUdf): FlinkUdf[] {
    if (!this.provider.computePool) {
      return [];
    }
    return this.provider.filterChildren(element, this.udfs);
  }

  getTreeItem(element: FlinkUdf): TreeItem {
    return new FlinkUdfTreeItem(element);
  }

  setParentResource(): void {
    // no-op for now
  }
}

export class FlinkArtifactsViewProvider
  extends MultiModeViewProvider<CCloudFlinkComputePool>
  implements TreeDataProvider<any>
{
  readonly kind = "flinkArtifacts";
  loggerName = "viewProviders.flinkArtifacts";
  viewId = "confluent-flink-artifacts";

  parentResourceChangedEmitter = currentFlinkArtifactsPoolChanged;
  parentResourceChangedContextValue = ContextValues.flinkArtifactsPoolSelected;
  protected defaultMode = FlinkArtifactsViewMode.Artifacts;
  protected modeContextValue = ContextValues.flinkArtifactsMode;

  constructor() {
    super();
    this.registerMode(FlinkArtifactsViewMode.Artifacts, new FlinkArtifactsMode(this));
    this.registerMode(FlinkArtifactsViewMode.Udfs, new FlinkUdfMode(this));
    void setContextValue(this.modeContextValue, this.defaultMode);
  }

  get computePool(): CCloudFlinkComputePool | null {
    return this.resource;
  }

  async switchToArtifacts(): Promise<void> {
    await this.switchMode(FlinkArtifactsViewMode.Artifacts);
  }

  async switchToUdfs(): Promise<void> {
    await this.switchMode(FlinkArtifactsViewMode.Udfs);
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
