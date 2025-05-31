import { commands, env, Uri, Disposable } from "vscode";
import {
  canAccessSchemaForTopic,
  showNoSchemaAccessWarningNotification,
} from "../authz/schemaRegistry";
import { LOCAL_CONNECTION_ID } from "../constants";
import { getExtensionContext } from "../context/extension";
import {
  CCloudResourceLoader,
  DirectResourceLoader,
  LocalResourceLoader,
  ResourceLoader,
} from "../loaders";
import { ConnectionId } from "../models/resource";
import { type KafkaTopic } from "../models/topic";
import { kafkaClusterQuickPick } from "../quickpicks/kafkaClusters";
import { topicQuickPick } from "../quickpicks/topics";
import { getSidecar } from "../sidecar";
import { logUsage, UserEvent } from "../telemetry/events";
import { registerCommandWithLogging } from ".";
import { MessageViewerConfig } from "../messageViewer/config";
import { MessageViewerManager } from "../messageViewer/manager";

/**
 * Main command to consume messages from a topic
 */
async function consumeCommand(
  topic?: KafkaTopic,
  duplicate = false,
  config = MessageViewerConfig.create(),
): Promise<void> {
  logUsage(UserEvent.MessageViewerAction, {
    action: "command-invoked",
    duplicate,
    connection_type: topic?.connectionType,
  });

  if (topic == null) {
    const cluster = await kafkaClusterQuickPick();
    if (cluster == null) return;
    topic = await topicQuickPick(cluster);
    if (topic == null) return;
  }

  if (!(await canAccessSchemaForTopic(topic))) {
    showNoSchemaAccessWarningNotification();
  }

  const sidecar = await getSidecar();
  const messageViewerManager = MessageViewerManager.getInstance();
  await messageViewerManager.createOrShowMessageViewer(topic, duplicate, config, sidecar);
}

/**
 * Command to duplicate the currently active message viewer
 */
async function duplicateMessageViewerCommand(): Promise<void> {
  const messageViewerManager = MessageViewerManager.getInstance();
  const activeTopic = messageViewerManager.getActiveTopic();
  if (activeTopic != null) {
    commands.executeCommand("confluent.topic.consume", activeTopic, true);
  }
}

/**
 * Command to generate and copy a shareable URI for the current message viewer
 */
async function getMessageViewerUriCommand(): Promise<void> {
  const messageViewerManager = MessageViewerManager.getInstance();
  const uri = await generateMessageViewerUri(messageViewerManager);
  if (uri) {
    await env.clipboard.writeText(uri.toString());
    logUsage(UserEvent.MessageViewerAction, { action: "uri-copied" });
  }
}

/**
 * Command to create a message viewer from a shared URI
 */
async function createMessageViewerFromUriCommand(uri: Uri): Promise<void> {
  await createMessageViewerFromUri(uri);
}

/**
 * Registers all message viewer related commands
 */
export function registerMessageViewerCommands(): Disposable[] {
  return [
    registerCommandWithLogging("confluent.topic.consume", consumeCommand),
    registerCommandWithLogging("confluent.topic.consume.duplicate", duplicateMessageViewerCommand),
    registerCommandWithLogging("confluent.topic.consume.getUri", getMessageViewerUriCommand),
    registerCommandWithLogging(
      "confluent.topic.consume.fromUri",
      createMessageViewerFromUriCommand,
    ),
  ];
}

/**
 * Generates a shareable URI for the current message viewer state
 */
async function generateMessageViewerUri(
  messageViewerManager: MessageViewerManager,
): Promise<Uri | null> {
  const activeTopic = messageViewerManager.getActiveTopic();
  const activeConfig = messageViewerManager.getActiveConfig();

  if (activeTopic == null || activeConfig == null) {
    return null;
  }

  const query = activeConfig.toQuery();
  query.set("origin", activeTopic.connectionType.toLowerCase());
  query.set("envId", activeTopic.environmentId);
  query.set("clusterId", activeTopic.clusterId);
  query.set("topicName", activeTopic.name);

  const context = getExtensionContext();
  return Uri.from({
    scheme: "vscode",
    authority: context.extension.id,
    path: "/consume",
    query: query.toString(),
  });
}

/**
 * Creates a message viewer from a shared URI
 */
async function createMessageViewerFromUri(uri: Uri): Promise<void> {
  const params = new URLSearchParams(uri.query);
  const origin = params.get("origin");
  let envId = params.get("envId");
  const clusterId = params.get("clusterId");
  const topicName = params.get("topicName");

  if (clusterId == null || topicName == null) {
    throw new Error("Unable to open Message Viewer: URI is malformed");
  }

  if (origin === "local" && !envId) {
    // backwards compatibility for old URIs before we started using local env IDs
    envId = LOCAL_CONNECTION_ID;
  }

  const loader = getResourceLoaderForOrigin(origin, envId);
  if (!loader || envId == null) {
    throw new Error("Unable to open Message Viewer: URI is malformed");
  }

  const cluster = await findClusterForUri(loader, envId, clusterId);
  const topic = await findTopicForUri(loader, cluster, topicName);
  const config = MessageViewerConfig.fromQuery(params);

  commands.executeCommand("confluent.topic.consume", topic, true, config);
}

/**
 * Gets the appropriate resource loader based on the origin type
 */
function getResourceLoaderForOrigin(
  origin: string | null,
  envId: string | null,
): ResourceLoader | null {
  switch (origin) {
    case "ccloud":
      return CCloudResourceLoader.getInstance();
    case "local":
      return LocalResourceLoader.getInstance();
    case "direct":
      if (envId == null) return null;
      return DirectResourceLoader.getInstance(envId as ConnectionId);
    default:
      return null;
  }
}

/**
 * Finds a cluster by ID for the given environment
 */
async function findClusterForUri(loader: ResourceLoader, envId: string, clusterId: string) {
  const clusters = await loader.getKafkaClustersForEnvironmentId(envId);
  const cluster = clusters.find((cluster) => cluster.id === clusterId);

  if (cluster == null) {
    throw new Error("Unable to open Message Viewer: cluster not found");
  }

  return cluster;
}

/**
 * Finds a topic by name in the given cluster
 */
async function findTopicForUri(loader: ResourceLoader, cluster: any, topicName: string) {
  const topics = await loader.getTopicsForCluster(cluster);

  if (topics == null) {
    throw new Error("Unable to open Message Viewer: can't load topics");
  }

  const topic = topics.find((topic) => topic.name === topicName);

  if (topic == null) {
    throw new Error("Unable to open Message Viewer: topic not found");
  }

  return topic;
}
