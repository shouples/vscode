import { ConnectionType } from "../clients/sidecar";
import { getDirectResources } from "../graphql/direct";
import { Logger } from "../logging";
import { DirectEnvironment } from "../models/environment";
import { DirectKafkaCluster } from "../models/kafkaCluster";
import { ConnectionId, EnvironmentId } from "../models/resource";
import { DirectSchemaRegistry } from "../models/schemaRegistry";
import { ResourceLoader } from "./resourceLoader";

/**
 * {@link ResourceLoader} implementation for direct connections.
 *
 * Similar to the `LocalResourceLoader` in that it doesn't cache anything, but the
 * {@link DirectResourceLoader} keeps track of its own {@link ConnectionId} and is not a singleton.
 */
export class DirectResourceLoader extends ResourceLoader {
  connectionId: ConnectionId;
  cachedEnvironments: DirectEnvironment[] | undefined;
  connectionType = ConnectionType.Direct;
  logger: Logger;

  // non-singleton since we have to manager per-connection loading
  constructor(id: ConnectionId) {
    super();
    this.connectionId = id;
    this.logger = new Logger(`DirectResourceLoader ${id}`);
    this.cachedEnvironments = undefined;
  }

  /**
   * Get the environments for this connection. Will be a single-element array.
   *
   * If `forceDeepRefresh` is true, it will always fetch the environments from the server.
   * Otherwise, it will return cached environments if available.
   */
  async getEnvironments(forceDeepRefresh: boolean = false): Promise<DirectEnvironment[]> {
    if (!this.cachedEnvironments || forceDeepRefresh) {
      // Look up the one-or-none DirectEnvironment for this connection.
      const env: DirectEnvironment | undefined = await getDirectResources(this.connectionId);
      // if we got undefined back, there was a problem with the GraphQL query so we shouldn't cache
      // and will try again (deep refresh) next time
      this.cachedEnvironments = env ? [env] : undefined;
      this.logger.debug("getEnvironments() deep refresh");
    } else {
      this.logger.debug("getEnvironments() cache hit");
    }
    return this.cachedEnvironments ?? [];
  }

  /**
   * Clear all cached data for this connection.
   */
  purgeCache(): void {
    this.logger.debug("purgeCache()");
    this.cachedEnvironments = undefined;
  }

  async getKafkaClustersForEnvironmentId(
    environmentId: EnvironmentId,
  ): Promise<DirectKafkaCluster[]> {
    const env = (await this.getEnvironment(environmentId)) as DirectEnvironment | undefined;
    if (!env) {
      throw new Error(`Unknown environmentId ${environmentId}`);
    }
    return env.kafkaClusters;
  }

  async getSchemaRegistries(): Promise<DirectSchemaRegistry[]> {
    const envs: DirectEnvironment[] = await this.getEnvironments();
    const schemaRegistries: DirectSchemaRegistry[] = [];
    envs.forEach((env) => {
      if (env.schemaRegistry) {
        schemaRegistries.push(env.schemaRegistry);
      }
    });
    return schemaRegistries;
  }

  async getSchemaRegistryForEnvironmentId(
    environmentId: string | undefined,
  ): Promise<DirectSchemaRegistry | undefined> {
    const schemaRegistries: DirectSchemaRegistry[] = await this.getSchemaRegistries();
    return schemaRegistries.find((sr) => sr.environmentId === environmentId);
  }
}
