import * as vscode from "vscode";
import { CCloudEnvironment } from "./models/environment";
import { CCloudFlinkComputePool } from "./models/flinkComputePool";
import { FlinkStatement, FlinkStatementId } from "./models/flinkStatement";
import { KafkaCluster } from "./models/kafkaCluster";
import { ConnectionId, EnvironmentId } from "./models/resource";
import { Subject, SubjectWithSchemas } from "./models/schema";
import { SchemaRegistry } from "./models/schemaRegistry";

// NOTE: these are kept at the global level to allow for easy access from any file and track where
// we .fire() events and where we react to them via .event()

/**
 * Indicate whether or not we have a CCloud connection (controlled by our auth provider).
 *
 * This is controlled by the `ConfluentCloudAuthProvider` and will be fired when a user explicitly
 * signs in (`createSession()`), signs out (`removeSession()`), or when a new workspace is opened
 * and its newly-activated extension instance is syncing its own internal CCloud auth state to
 * transition from "freshly activated, no CCloud auth session" to "found active CCloud auth session".
 */
export const ccloudConnected = new vscode.EventEmitter<boolean>();
/** Fires whenever we see a non-`ATTEMPTING` connected state from the sidecar for the current CCloud
 * connection, and is only used to resolve any open progress notification(s). */
export const stableCCloudConnectedState = new vscode.EventEmitter<void>();
/** Signal to the auth provider that we no longer have a valid CCloud connection. */
export const ccloudAuthSessionInvalidated = new vscode.EventEmitter<void>();
export const ccloudOrganizationChanged = new vscode.EventEmitter<void>();

/** Fired whenever the list of direct connections changes. */
export const directConnectionsChanged = new vscode.EventEmitter<void>();

/** Fired when websocket event for a CREATED direct connection environment is received. */
export const directConnectionCreated = new vscode.EventEmitter<ConnectionId>();

export const localKafkaConnected = new vscode.EventEmitter<boolean>();
export const localSchemaRegistryConnected = new vscode.EventEmitter<boolean>();

/** Fired when a FlinkStatementManager-monitored non-terminal statement has been observed to have changed. */
export const flinkStatementUpdated = new vscode.EventEmitter<FlinkStatement>();
/** Fired when a FlinkStatementManager-monitored statement 404s ccloud-side. */
export const flinkStatementDeleted = new vscode.EventEmitter<FlinkStatementId>();

export type EventChangeType = "added" | "deleted";

/** A whole subject within a schema registry has been added or deleted. */
export type SubjectChangeEvent = {
  change: EventChangeType;
} & (
  | {
      change: "added";
      /** When a subject is added, it will carry the new (probably singleton) schema(s) within. */
      subject: SubjectWithSchemas;
    }
  | {
      change: "deleted";
      /** When a subject is deleted, it will not contain schemas */
      subject: Subject;
    }
);

/** Fired when a whole SR subject has either been added or deleted. */
export const schemaSubjectChanged = new vscode.EventEmitter<SubjectChangeEvent>();

/** A schema version was added or removed from a preexisting and remaining existing subject. */
export type SchemaVersionChangeEvent = {
  change: EventChangeType;

  /** The new Subject representation, with refreshed non-null and non-empty .schemas */
  subject: SubjectWithSchemas;
};

/** Fired when a schema version has been either created or deleted within a preexisting subject.*/
export const schemaVersionsChanged = new vscode.EventEmitter<SchemaVersionChangeEvent>();

/** Event type used by {@link environmentChanged} */
export type EnvironmentChangeEvent = {
  /** The environment that changed. */
  id: EnvironmentId;
  /** Was it that the env has been deleted? */
  wasDeleted: boolean;
};

/**
 * Fired whenever a property of an {@link Environment} has changed. (Mainly to affect watchers in
 * the Topics/Schemas views, or similar.)
 **/
export const environmentChanged = new vscode.EventEmitter<EnvironmentChangeEvent>();

/**
 * Fired whenever a Kafka cluster is selected from the Resources view, chosen from the "Select Kafka
 * Cluster" action from the Topics view, or cleared out from a connection (or CCloud organization)
 * change.
 */
export const currentKafkaClusterChanged = new vscode.EventEmitter<KafkaCluster | null>();
/**
 * Fired whenever a Schema Registry is selected from the Resources view, chosen from the
 * "Select Schema Registry" action from the Schemas view, or cleared out from a connection
 * (or CCloud organization) change.
 */
export const currentSchemaRegistryChanged = new vscode.EventEmitter<SchemaRegistry | null>();
/**
 * Fired whenever a Flink compute pool is selected from the Resources view or the Flink Statements
 * view, chosen from the "Select Flink Compute Pool" action from the Flink Statements view or
 * command palette, or cleared out from a connection (or CCloud organization) change.
 *
 * OR when the "View Flink Statements" action is triggered from a ccloud environment's
 * context menu in the Resources view.
 */
export const currentFlinkStatementsResourceChanged = new vscode.EventEmitter<
  CCloudFlinkComputePool | CCloudEnvironment | null
>();
/**
 * Fired whenever a Flink compute pool is selected from the Resources view or the Flink Artifacts
 * view, chosen from the "Select Flink Compute Pool" action from the Flink Artifacts view or
 * command palette, or cleared out from a connection (or CCloud organization) change.
 */
export const currentFlinkArtifactsPoolChanged =
  new vscode.EventEmitter<CCloudFlinkComputePool | null>();

export const connectionStable = new vscode.EventEmitter<ConnectionId>();

/** The user set/unset a filter for the Resources view. */
export const resourceSearchSet = new vscode.EventEmitter<string | null>();
/** The user set/unset a filter for the Topics view. */
export const topicSearchSet = new vscode.EventEmitter<string | null>();
/** The user set/unset a filter for the Schemas view. */
export const schemaSearchSet = new vscode.EventEmitter<string | null>();
/** The user set/unset a filter for the Flink Statements view. */
export const flinkStatementSearchSet = new vscode.EventEmitter<string | null>();

export const projectScaffoldUri = new vscode.EventEmitter<vscode.Uri>();

/** Metadata for a given {@link vscode.Uri} has been updated. */
export const uriMetadataSet = new vscode.EventEmitter<vscode.Uri>();
