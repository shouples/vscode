import * as assert from "assert";
import * as sinon from "sinon";
import { ConnectionType } from "../clients/sidecar";
import * as baseCommands from "../commands";
import * as scaffoldModule from "./scaffold";
import {
  registerProjectGenerationCommands,
  resourceScaffoldProjectRequest,
} from "./commands";
import { CCloudKafkaCluster } from "../models/kafkaCluster";
import { KafkaTopic } from "../models/topic";
import { CCloudFlinkComputePool } from "../models/flinkComputePool";
import * as resourceLoaderModule from "../loaders";
import * as ccloudResourceLoaderModule from "../loaders/ccloudResourceLoader";
import * as notifications from "../notifications";

// helper to create KafkaTopic instance
const TEST_TOPIC = KafkaTopic.create({
  connectionId: "conn",
  connectionType: ConnectionType.Ccloud,
  iconName: "" as any,
  name: "topic",
  replication_factor: 1,
  partition_count: 1,
  partitions: {},
  configs: {},
  is_internal: false,
  clusterId: "cluster",
  environmentId: "env",
  operations: [],
});

const TEST_CLUSTER = CCloudKafkaCluster.create({
  id: "cluster",
  name: "cluster",
  bootstrapServers: "SASL_SSL://broker:9092",
  provider: "aws",
  region: "useast1",
  environmentId: "env",
});

describe("projectGeneration commands", () => {
  let sandbox: sinon.SinonSandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("registerProjectGenerationCommands wires commands", () => {
    const disp = { dispose: () => {} } as any;
    const stub = sandbox.stub(baseCommands, "registerCommandWithLogging").returns(disp);
    const disposables = registerProjectGenerationCommands();
    assert.strictEqual(stub.callCount, 2);
    assert.strictEqual(disposables.length, 2);
  });

  describe("resourceScaffoldProjectRequest", () => {
    it("handles Kafka clusters", async () => {
      const resp = { success: true, message: "ok" };
      const scaffoldStub = sandbox
        .stub(scaffoldModule, "scaffoldProjectRequest")
        .resolves(resp);
      const result = await resourceScaffoldProjectRequest(TEST_CLUSTER);
      sinon.assert.calledOnceWithExactly(
        scaffoldStub,
        {
          bootstrap_server: "broker:9092",
          cc_bootstrap_server: "broker:9092",
          templateType: "kafka",
        },
        "cluster",
      );
      assert.strictEqual(result, resp);
    });

    it("handles Kafka topics", async () => {
      sandbox.stub(resourceLoaderModule.ResourceLoader, "getInstance").returns({
        getKafkaClustersForEnvironmentId: async () => [TEST_CLUSTER],
      } as any);
      const scaffoldStub = sandbox
        .stub(scaffoldModule, "scaffoldProjectRequest")
        .resolves({ success: true, message: "ok" });
      await resourceScaffoldProjectRequest(TEST_TOPIC);
      sinon.assert.calledOnceWithExactly(
        scaffoldStub,
        {
          bootstrap_server: "broker:9092",
          cc_bootstrap_server: "broker:9092",
          cc_topic: "topic",
          topic: "topic",
          templateType: "kafka",
        },
        "topic",
      );
    });

    it("shows error when topic's cluster missing", async () => {
      sandbox.stub(resourceLoaderModule.ResourceLoader, "getInstance").returns({
        getKafkaClustersForEnvironmentId: async () => [],
      } as any);
      const errStub = sandbox.stub(notifications, "showErrorNotificationWithButtons");
      const scaffoldStub = sandbox.stub(scaffoldModule, "scaffoldProjectRequest");
      await resourceScaffoldProjectRequest(TEST_TOPIC);
      sinon.assert.calledOnce(errStub);
      sinon.assert.notCalled(scaffoldStub);
    });

    it("handles Flink compute pools", async () => {
      const pool = new CCloudFlinkComputePool({
        id: "cp1",
        name: "pool",
        provider: "aws",
        region: "us-west-2",
        maxCfu: 1,
        environmentId: "env",
      });
      sandbox.stub(ccloudResourceLoaderModule.CCloudResourceLoader, "getInstance").returns({
        getOrganization: async () => ({ id: "org" }),
      } as any);
      const scaffoldStub = sandbox
        .stub(scaffoldModule, "scaffoldProjectRequest")
        .resolves({ success: true, message: "ok" });
      await resourceScaffoldProjectRequest(pool);
      sinon.assert.calledOnceWithExactly(
        scaffoldStub,
        {
          cc_environment_id: "env",
          cc_organization_id: "org",
          cloud_region: "us-west-2",
          cloud_provider: "aws",
          cc_compute_pool_id: "cp1",
          templateType: "flink",
        },
        "compute pool",
      );
    });
  });
});
