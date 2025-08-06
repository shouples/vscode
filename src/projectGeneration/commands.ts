import * as vscode from "vscode";

import { registerCommandWithLogging } from "../commands";
import { CCloudResourceLoader } from "../loaders/ccloudResourceLoader";
import { ResourceLoader } from "../loaders";
import { Logger } from "../logging";
import { CCloudFlinkComputePool } from "../models/flinkComputePool";
import { KafkaCluster } from "../models/kafkaCluster";
import { CCloudOrganization } from "../models/organization";
import { KafkaTopic } from "../models/topic";
import { showErrorNotificationWithButtons } from "../notifications";
import { removeProtocolPrefix } from "../utils/bootstrapServers";
import { PostResponse } from "../webview/scaffold-form";
import { scaffoldProjectRequest } from "./scaffold";

const logger = new Logger("scaffold.commands");

export function registerProjectGenerationCommands(): vscode.Disposable[] {
  return [
    registerCommandWithLogging("confluent.scaffold", scaffoldProjectRequest),
    registerCommandWithLogging(
      "confluent.resources.scaffold",
      resourceScaffoldProjectRequest,
    ),
  ];
}

export async function resourceScaffoldProjectRequest(
  item?: KafkaCluster | KafkaTopic | CCloudFlinkComputePool,
): Promise<PostResponse | void> {
  if (item instanceof KafkaCluster) {
    const bootstrapServers: string = removeProtocolPrefix(item.bootstrapServers);
    return await scaffoldProjectRequest(
      {
        bootstrap_server: bootstrapServers,
        cc_bootstrap_server: bootstrapServers,
        templateType: "kafka",
      },
      "cluster",
    );
  } else if (item instanceof KafkaTopic) {
    const clusters = await ResourceLoader.getInstance(
      item.connectionId,
    ).getKafkaClustersForEnvironmentId(item.environmentId);
    const cluster = clusters.find((c) => c.id === item.clusterId);
    if (!cluster) {
      showErrorNotificationWithButtons(
        `Unable to find Kafka cluster for topic "${item.name}".`,
      );
      return;
    }
    const bootstrapServers: string = removeProtocolPrefix(
      cluster.bootstrapServers,
    );
    return await scaffoldProjectRequest(
      {
        bootstrap_server: bootstrapServers,
        cc_bootstrap_server: bootstrapServers,
        cc_topic: item.name,
        topic: item.name,
        templateType: "kafka",
      },
      "topic",
    );
  } else if (item instanceof CCloudFlinkComputePool) {
    const organization: CCloudOrganization | undefined =
      await CCloudResourceLoader.getInstance().getOrganization();
    return await scaffoldProjectRequest(
      {
        cc_environment_id: item.environmentId,
        cc_organization_id: organization?.id,
        cloud_region: item.region,
        cloud_provider: item.provider,
        cc_compute_pool_id: item.id,
        templateType: "flink",
      },
      "compute pool",
    );
  }
  logger.debug("Resource type not supported for project scaffolding");
}

