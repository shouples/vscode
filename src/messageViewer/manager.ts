import { Disposable, ViewColumn, WebviewPanel } from "vscode";
import { Logger } from "../logging";
import { type KafkaTopic } from "../models/topic";
import { scheduler } from "../scheduler";
import { type SidecarHandle } from "../sidecar";
import { logUsage, UserEvent } from "../telemetry/events";
import { WebviewPanelCache } from "../webview-cache";
import messageViewerTemplate from "../webview/message-viewer.html";
import { MessageViewerConfig } from "./config";
import { createMessageViewerPanel } from "./panel";

const logger = new Logger("messageViewer.manager");

/**
 * Manages message viewer instances following the singleton pattern.
 * Handles creation, caching, and lifecycle of message viewer panels.
 */
export class MessageViewerManager implements Disposable {
  private static instance: MessageViewerManager | null = null;
  private readonly disposables: Disposable[] = [];

  /* All active message viewer instances share the same scheduler to perform API
  requests. The scheduler defines number of concurrent requests at a time and a
  minimum time interval for a single task to unblock a "thread". This all allows
  faster consumption of retained messages for a single message viewer and prevents
  rate limiting for multiple active message viewers. */
  private readonly schedule = scheduler(4, 500);

  /* We track active topic as a kafka topic of a webview panel that is currently
  visible on the screen. When the user clicks on Duplicate Message Browser action
  at the top of the window, we can use the topic entity to start another message
  viewer with the same topic. Otherwise, we use webview panel cache to only keep
  a single active message browser per topic. */
  private activeTopic: KafkaTopic | null = null;
  private activeConfig: MessageViewerConfig | null = null;
  private readonly cache = new WebviewPanelCache();

  private constructor() {}

  static getInstance(): MessageViewerManager {
    if (!MessageViewerManager.instance) {
      MessageViewerManager.instance = new MessageViewerManager();
    }
    return MessageViewerManager.instance;
  }

  /**
   * Creates or shows a message viewer for the specified topic
   */
  async createOrShowMessageViewer(
    topic: KafkaTopic,
    duplicate = false,
    config = MessageViewerConfig.create(),
    sidecar: SidecarHandle,
  ): Promise<void> {
    logger.debug("Creating or showing message viewer", {
      topicName: topic.name,
      clusterId: topic.clusterId,
      duplicate,
    });

    // this panel going to be active, so setting its topic to the currently active
    this.activeTopic = topic;
    this.activeConfig = config;

    const [panel, cached] = this.cache.findOrCreate(
      {
        id: `${topic.clusterId}/${topic.name}`,
        multiple: duplicate,
        template: this.getMessageViewerTemplate(),
      },
      "message-viewer",
      `Topic: ${topic.name}`,
      ViewColumn.One,
      { enableScripts: true },
    );

    if (cached) {
      panel.reveal();
      logUsage(UserEvent.MessageViewerAction, {
        action: "panel-revealed",
        connection_type: topic.connectionType,
        topic_hash: this.hashTopicName(topic.name),
      });
    } else {
      this.setupNewPanel(panel, config, topic, sidecar);
    }
  }

  /**
   * Gets the currently active topic
   */
  getActiveTopic(): KafkaTopic | null {
    return this.activeTopic;
  }

  /**
   * Gets the currently active config
   */
  getActiveConfig(): MessageViewerConfig | null {
    return this.activeConfig;
  }

  /**
   * Sets up event handlers and polling for a new message viewer panel
   */
  private setupNewPanel(
    panel: WebviewPanel,
    config: MessageViewerConfig,
    topic: KafkaTopic,
    sidecar: SidecarHandle,
  ): void {
    panel.onDidChangeViewState((e) => {
      // whenever we switch between panels, override active topic and config
      if (e.webviewPanel.active) {
        this.activeTopic = topic;
        this.activeConfig = config;
      }
    });

    const panelDisposable = createMessageViewerPanel(
      panel,
      config,
      (value) => (this.activeConfig = config = value),
      topic,
      sidecar,
      this.schedule,
    );

    // Clean up when panel is disposed
    panel.onDidDispose(() => {
      panelDisposable?.dispose();
      logger.debug("Message viewer panel disposed", {
        topicName: topic.name,
        clusterId: topic.clusterId,
      });
    });

    logUsage(UserEvent.MessageViewerAction, {
      action: "panel-created",
      connection_type: topic.connectionType,
      topic_hash: this.hashTopicName(topic.name),
    });
  }

  /**
   * Gets the message viewer HTML template function
   */
  private getMessageViewerTemplate() {
    return messageViewerTemplate;
  }

  /**
   * Hash topic name for telemetry (following existing pattern)
   */
  private hashTopicName(topicName: string): string {
    // This will use the existing hashed utility when we extract it
    return topicName; // Temporary implementation
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    // WebviewPanelCache doesn't have a dispose method, it cleans up automatically
    MessageViewerManager.instance = null;
  }
}
