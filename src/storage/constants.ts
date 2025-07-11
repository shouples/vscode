/** Workspace state keys. A single enum to hold some of the keys the extension uses
 * to cache data within the workspace storage via ResourceManager.
 *
 * Other keys are dynamically generated by {@link ResourceManager.generateWorkspaceStorageKey} */
export enum WorkspaceStorageKeys {
  /** What (Schema) URI was chosen first to diff against? */
  DIFF_BASE_URI = "diffs.selectedResource",

  /** Map of URIs to their associated metadata record/objects. */
  URI_METADATA = "uriMetadata",
}

export enum GlobalStorageKeys {
  /** The extension version that most recently activated. */
  LAST_ACTIVATED_EXTENSION_VERSION = "lastActivatedExtensionVersion",
}

/** Keys for use within UriMetadata records */
export enum UriMetadataKeys {
  FLINK_COMPUTE_POOL_ID = "flinkComputePoolId",
  FLINK_DATABASE_ID = "flinkDatabaseId",
}

export enum SecretStorageKeys {
  /**
   * Key holding the auth token to communicate with ide-sidecar.
   */
  SIDECAR_AUTH_TOKEN = "sidecarAuthToken",

  /**
   * Indicate the outcome of the last CCloud authentication attempt.
   * Used by the `ConfluentCloudAuthProvider` to resolve promises that are waiting for the user's
   * browser-based authentication flow to complete after handling a URI callback from the sidecar.
   */
  AUTH_COMPLETED = "authCompleted",

  /** The user recently reset their password and needs to reauthenticate. */
  AUTH_PASSWORD_RESET = "authPasswordReset",

  /** Only used as a way to kick off cross-workspace events for the authentication provider. Only
   * ever set to "true" or deleted. */
  AUTH_SESSION_EXISTS = "authSessionExists",

  /** Store the latest CCloud auth status from the sidecar, controlled by the auth poller. */
  CCLOUD_AUTH_STATUS = "ccloudAuthStatus",

  /** A map of connection id:ConnectionSpec */
  DIRECT_CONNECTIONS = "directConnections",

  /** Any user credentials gathered from `docker-credential-*` to pass via the X-Registry-Auth
   * header to Docker engine API requests. */
  DOCKER_CREDS_SECRET_KEY = "docker-creds",
}

/** Key used to store the current storage version across global/workspace state and SecretStorage. */
export const DURABLE_STORAGE_VERSION_KEY = "storageVersion";
export enum MigrationStorageType {
  GLOBAL = "global",
  WORKSPACE = "workspace",
  SECRET = "secret",
}
