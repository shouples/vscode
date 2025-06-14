import * as assert from "assert";
import * as vscode from "vscode";
import sinon from "sinon";
import { TEST_CCLOUD_KAFKA_CLUSTER, TEST_LOCAL_KAFKA_CLUSTER } from "../../tests/unit/testResources/kafkaCluster";
import { CCloudKafkaCluster, KafkaCluster, LocalKafkaCluster } from "../models/kafkaCluster";
import { KafkaTopic } from "../models/topic";
import { createTopicCommand, deleteTopicCommand, copyBootstrapServers } from "./kafkaClusters";
import * as sidecar from "../sidecar";
import { ResponseError } from "../clients/kafkaRest"; // Correct import for ResponseError
import * as authzTopics from "../authz/topics";
import * as topicViewProviders from "../viewProviders/topics";
import * as emitters from "../emitters";
import * as kafkaClusterQuickPicks from "../quickpicks/kafkaClusters";


// Note: The jest.mock calls are removed as we are switching to Sinon for mocking.

describe("kafkaCluster commands", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Stub vscode APIs that are used directly
    // sandbox.stub(vscode.env.clipboard, "writeText"); // Moved to copyBootstrapServers
    // sandbox.stub(vscode.env.clipboard, "readText");  // Moved to copyBootstrapServers
    sandbox.stub(vscode.window, "showInformationMessage");
    // Common stubs for window methods used in both create and delete
    sandbox.stub(vscode.window, "showInputBox");
    sandbox.stub(vscode.window, "showErrorMessage");
    sandbox.stub(vscode.window, "withProgress").callsFake(async (options, task) => task({ report: sandbox.stub() }));

  });

  afterEach(() => {
    sandbox.restore();
  });


  describe("copyBootstrapServers", () => {
    let _originalClipboardContents: string | undefined;
    let writeTextStub: sinon.SinonStub;
    let readTextStub: sinon.SinonStub;

    beforeEach(async () => {
      writeTextStub = sandbox.stub(vscode.env.clipboard, "writeText");
      readTextStub = sandbox.stub(vscode.env.clipboard, "readText");
      _originalClipboardContents = await readTextStub(); // Use the fresh stub
    });

    // No specific afterEach needed here for stubs as sandbox.restore() handles it.
    // The original afterEach for restoring clipboard content is fine if we want to ensure
    // the *actual* clipboard is restored in a real environment, but in Sinon tests,
    // the stubs prevent actual clipboard interaction. For robustness, keeping it doesn't hurt
    // if tests were ever run in a mixed stub/real mode, but it's not strictly necessary for pure stubbed tests.
    // For now, let's keep it to ensure original behavior if stubs were bypassed.
    afterEach(async () => {
      if (_originalClipboardContents !== undefined) {
        // This would call the original if not stubbed, or the stub if still active.
        // Since sandbox.restore() is called in parent afterEach, this is more for conceptual integrity.
        await vscode.env.clipboard.writeText(_originalClipboardContents);
      }
    });

    it("should copy protocol-free bootstrap server(s) to the clipboard", async () => {
      const testCluster: CCloudKafkaCluster = CCloudKafkaCluster.create({
        ...TEST_CCLOUD_KAFKA_CLUSTER,
        bootstrapServers: "SASL_SSL://s1.com:2343,FOO://s2.com:1234,s4.com:4455",
      });

      // Configure the readText stub to return something specific if needed by the test logic itself,
      // though for this test, it's mainly about what's written.
      // (vscode.env.clipboard.readText as sinon.SinonStub).resolves("initial clipboard content"); // Not needed for this test flow
      writeTextStub.resolves(); // Ensure the stubbed writeText resolves

      await copyBootstrapServers(testCluster);

      sinon.assert.calledWith(writeTextStub, "s1.com:2343,s2.com:1234,s4.com:4455");
      sinon.assert.calledOnce(vscode.window.showInformationMessage as sinon.SinonStub);
    });
  });

  describe("createTopicCommand", () => {
    let mockKafkaCluster: KafkaCluster;
    let showInputBoxStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    // let withProgressStub: sinon.SinonStub; // Already in main sandbox
    let getSidecarStub: sinon.SinonStub;
    let createKafkaTopicStub: sinon.SinonStub;
    let getKafkaTopicStub: sinon.SinonStub;
    let getTopicV3ApiStub: sinon.SinonStub;
    let topicViewProviderRefreshStub: sinon.SinonStub;
    let getTopicViewProviderStub: sinon.SinonStub;
    let kafkaClusterQuickPickStub: sinon.SinonStub;


    beforeEach(() => {
      mockKafkaCluster = LocalKafkaCluster.create(TEST_LOCAL_KAFKA_CLUSTER);

      showInputBoxStub = vscode.window.showInputBox as sinon.SinonStub;
      showErrorMessageStub = vscode.window.showErrorMessage as sinon.SinonStub;
      // withProgressStub = vscode.window.withProgress as sinon.SinonStub; // from main sandbox

      createKafkaTopicStub = sandbox.stub().resolves({});
      getKafkaTopicStub = sandbox.stub().resolves({});
      getTopicV3ApiStub = sandbox.stub().returns({
        createKafkaTopic: createKafkaTopicStub,
        getKafkaTopic: getKafkaTopicStub,
      });
      getSidecarStub = sandbox.stub(sidecar, "getSidecar").resolves({
        getTopicV3Api: getTopicV3ApiStub,
      });

      topicViewProviderRefreshStub = sandbox.stub();
      getTopicViewProviderStub = sandbox.stub(topicViewProviders, "getTopicViewProvider").returns({
        refresh: topicViewProviderRefreshStub,
        kafkaCluster: mockKafkaCluster,
      } as any);

      kafkaClusterQuickPickStub = sandbox.stub(kafkaClusterQuickPicks, "kafkaClusterQuickPick");
      sandbox.stub(emitters.currentKafkaClusterChanged, "fire");
    });

    it("should create a topic with valid input when cluster is passed as item", async () => {
      showInputBoxStub.onFirstCall().resolves("test-topic123");
      showInputBoxStub.onSecondCall().resolves("1");
      showInputBoxStub.onThirdCall().resolves("1");

      await createTopicCommand(mockKafkaCluster);

      sinon.assert.calledThrice(showInputBoxStub);
      sinon.assert.calledWith(createKafkaTopicStub, sinon.match({
        cluster_id: mockKafkaCluster.id,
        CreateTopicRequestData: {
          topic_name: "test-topic123",
          partitions_count: 1,
          replication_factor: 1,
        },
      }));
      sinon.assert.calledOnce(getKafkaTopicStub);
      sinon.assert.calledWith(getKafkaTopicStub, sinon.match({
        cluster_id: mockKafkaCluster.id,
        topic_name: "test-topic123",
      }));
      sinon.assert.calledOnceWithExactly(topicViewProviderRefreshStub, true, mockKafkaCluster.id);
      sinon.assert.notCalled(showErrorMessageStub);
    });

    it("should use selected cluster from topic view if no item passed", async () => {
      showInputBoxStub.onFirstCall().resolves("test-topic-no-item");
      showInputBoxStub.onSecondCall().resolves("1");
      showInputBoxStub.onThirdCall().resolves("1");

      await createTopicCommand(undefined);

      sinon.assert.calledWith(createKafkaTopicStub, sinon.match({
        cluster_id: mockKafkaCluster.id,
        CreateTopicRequestData: sinon.match({ topic_name: "test-topic-no-item" }),
      }));
      sinon.assert.notCalled(showErrorMessageStub);
    });

    it("should prompt for cluster using kafkaClusterQuickPick if no item and no topic view cluster", async () => {
      getTopicViewProviderStub.returns({
        refresh: topicViewProviderRefreshStub,
        kafkaCluster: null,
      }as any);

      const selectedCluster = LocalKafkaCluster.create({...TEST_LOCAL_KAFKA_CLUSTER, id: "selected-cluster", name: "Selected Cluster"});
      kafkaClusterQuickPickStub.resolves(selectedCluster);

      showInputBoxStub.onFirstCall().resolves("test-topic-selected");
      showInputBoxStub.onSecondCall().resolves("1");
      showInputBoxStub.onThirdCall().resolves("1");

      await createTopicCommand(undefined);

      sinon.assert.calledOnce(kafkaClusterQuickPickStub);
      sinon.assert.calledWith(createKafkaTopicStub, sinon.match({
        cluster_id: selectedCluster.id,
        CreateTopicRequestData: sinon.match({ topic_name: "test-topic-selected" }),
      }));
      sinon.assert.notCalled(showErrorMessageStub);
    });

    it("should exit if cluster selection via kafkaClusterQuickPick is cancelled", async () => {
      getTopicViewProviderStub.returns({
        refresh: topicViewProviderRefreshStub,
        kafkaCluster: null,
      }as any);
      kafkaClusterQuickPickStub.resolves(undefined);

      await createTopicCommand(undefined);

      sinon.assert.calledOnce(kafkaClusterQuickPickStub);
      sinon.assert.notCalled(showInputBoxStub);
      sinon.assert.notCalled(createKafkaTopicStub);
      sinon.assert.notCalled(showErrorMessageStub);
    });


    it("should show error for topic name longer than 249 chars", async () => {
      const longName = "a".repeat(250);
      showInputBoxStub.onFirstCall().resolves(longName);

      await createTopicCommand(mockKafkaCluster);

      sinon.assert.calledOnce(showInputBoxStub);
      sinon.assert.calledOnceWithExactly(showErrorMessageStub,
        "Invalid topic name. Topic names can only contain letters, numbers, periods (.), underscores (_), and hyphens (-), and must be between 1 and 249 characters long."
      );
      sinon.assert.notCalled(createKafkaTopicStub);
    });

    it("should show error for topic name with invalid characters", async () => {
      showInputBoxStub.onFirstCall().resolves("test!topic");

      await createTopicCommand(mockKafkaCluster);

      sinon.assert.calledOnce(showInputBoxStub);
      sinon.assert.calledOnceWithExactly(showErrorMessageStub,
        "Invalid topic name. Topic names can only contain letters, numbers, periods (.), underscores (_), and hyphens (-), and must be between 1 and 249 characters long."
      );
      sinon.assert.notCalled(createKafkaTopicStub);
    });

    it("should not proceed if user cancels topic name input", async () => {
      showInputBoxStub.onFirstCall().resolves(undefined);

      await createTopicCommand(mockKafkaCluster);

      sinon.assert.calledOnce(showInputBoxStub);
      sinon.assert.notCalled(createKafkaTopicStub);
      sinon.assert.notCalled(showErrorMessageStub);
    });

    it("should use default replication factor for CCloud cluster if not specified", async () => {
        const ccloudCluster = CCloudKafkaCluster.create(TEST_CCLOUD_KAFKA_CLUSTER);
        showInputBoxStub.onFirstCall().resolves("ccloud-topic");
        showInputBoxStub.onSecondCall().resolves("6");
        showInputBoxStub.onThirdCall().resolves("3");


        await createTopicCommand(ccloudCluster);

        sinon.assert.calledWith(createKafkaTopicStub, sinon.match({
            cluster_id: ccloudCluster.id,
            CreateTopicRequestData: {
                topic_name: "ccloud-topic",
                partitions_count: 6,
                replication_factor: 3,
            }
        }));
    });
  });

  describe("deleteTopicCommand", () => {
    let mockLocalKafkaTopic: KafkaTopic;
    let showInputBoxStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    // let withProgressStub: sinon.SinonStub; // from main sandbox
    let getSidecarStub: sinon.SinonStub;
    let deleteKafkaTopicStub: sinon.SinonStub;
    let getKafkaTopicStub: sinon.SinonStub;
    let getTopicV3ApiStub: sinon.SinonStub;
    let topicViewProviderRefreshStub: sinon.SinonStub;
    let getTopicViewProviderStub: sinon.SinonStub;
    let fetchTopicAuthorizedOperationsStub: sinon.SinonStub;


    beforeEach(() => {
      mockLocalKafkaTopic = new KafkaTopic(
        "test-topic-to-delete",
        TEST_LOCAL_KAFKA_CLUSTER.id,
        false,
        1,
        1,
        [],
        "local-connection-id"
      );

      showInputBoxStub = vscode.window.showInputBox as sinon.SinonStub;
      showErrorMessageStub = vscode.window.showErrorMessage as sinon.SinonStub;
      // withProgressStub = vscode.window.withProgress as sinon.SinonStub; // from main sandbox

      fetchTopicAuthorizedOperationsStub = sandbox.stub(authzTopics, "fetchTopicAuthorizedOperations");

      deleteKafkaTopicStub = sandbox.stub().resolves({});
      getKafkaTopicStub = sandbox.stub();

      getTopicV3ApiStub = sandbox.stub().returns({
        deleteKafkaTopic: deleteKafkaTopicStub,
        getKafkaTopic: getKafkaTopicStub,
      });
      getSidecarStub = sandbox.stub(sidecar, "getSidecar").resolves({
        getTopicV3Api: getTopicV3ApiStub,
      });

      topicViewProviderRefreshStub = sandbox.stub();
      getTopicViewProviderStub = sandbox.stub(topicViewProviders, "getTopicViewProvider").returns({
             refresh: topicViewProviderRefreshStub,
        } as any);
    });

    it("should delete a topic with valid confirmation", async () => {
      fetchTopicAuthorizedOperationsStub.resolves(["DELETE"]);
      showInputBoxStub.resolves(mockLocalKafkaTopic.name);
      getKafkaTopicStub.onFirstCall().rejects(new ResponseError(new Response(null, { status: 404 })));


      await deleteTopicCommand(mockLocalKafkaTopic);

      sinon.assert.calledOnce(fetchTopicAuthorizedOperationsStub);
      sinon.assert.calledOnce(showInputBoxStub);
      sinon.assert.calledOnce(deleteKafkaTopicStub);
      sinon.assert.calledWith(deleteKafkaTopicStub, sinon.match({
        cluster_id: mockLocalKafkaTopic.clusterId,
        topic_name: mockLocalKafkaTopic.name,
      }));
      sinon.assert.calledOnce(getKafkaTopicStub);
      sinon.assert.calledOnceWithExactly(topicViewProviderRefreshStub, true, mockLocalKafkaTopic.clusterId);
      sinon.assert.notCalled(showErrorMessageStub);
    });

    it("should show error and not delete if topic name confirmation is incorrect", async () => {
      fetchTopicAuthorizedOperationsStub.resolves(["DELETE"]);
      showInputBoxStub.callsFake(options => {
        const validationResult = options.validateInput("wrong-name");
        assert.deepStrictEqual(validationResult, {
          message: `Topic name "wrong-name" does not match "${mockLocalKafkaTopic.name}"`,
          severity: vscode.InputBoxValidationSeverity.Error,
        });
        return Promise.resolve(undefined);
      });

      await deleteTopicCommand(mockLocalKafkaTopic);

      sinon.assert.calledOnce(fetchTopicAuthorizedOperationsStub);
      sinon.assert.calledOnce(showInputBoxStub);
      sinon.assert.notCalled(deleteKafkaTopicStub);
    });

    it("should correctly use validateInput for topic name confirmation (direct check)", async () => {
        fetchTopicAuthorizedOperationsStub.resolves(["DELETE"]);
        let capturedValidateInput: ((value: string) => vscode.InputBoxValidationMessage | null) | undefined;
        showInputBoxStub.callsFake(options => {
            capturedValidateInput = options.validateInput;
            return Promise.resolve(mockLocalKafkaTopic.name);
        });
        getKafkaTopicStub.onFirstCall().rejects(new ResponseError(new Response(null, { status: 404 })));


        await deleteTopicCommand(mockLocalKafkaTopic);

        assert.ok(capturedValidateInput, "validateInput was not captured");
        if (capturedValidateInput) {
            assert.strictEqual(capturedValidateInput(mockLocalKafkaTopic.name), null, "Validation should pass for correct name");
            assert.deepStrictEqual(capturedValidateInput("wrong-name"), {
                message: `Topic name "wrong-name" does not match "${mockLocalKafkaTopic.name}"`,
                severity: vscode.InputBoxValidationSeverity.Error,
            }, "Validation should fail for incorrect name");
        }
        sinon.assert.calledOnce(deleteKafkaTopicStub);
    });


    it("should not proceed if user cancels topic name confirmation (showInputBox returns undefined)", async () => {
      fetchTopicAuthorizedOperationsStub.resolves(["DELETE"]);
      showInputBoxStub.resolves(undefined);

      await deleteTopicCommand(mockLocalKafkaTopic);

      sinon.assert.calledOnce(fetchTopicAuthorizedOperationsStub);
      sinon.assert.calledOnce(showInputBoxStub);
      sinon.assert.notCalled(deleteKafkaTopicStub);
      sinon.assert.notCalled(showErrorMessageStub);
    });

    it("should show error if user does not have DELETE permission", async () => {
      fetchTopicAuthorizedOperationsStub.resolves(["DESCRIBE"]);

      await deleteTopicCommand(mockLocalKafkaTopic);

      sinon.assert.calledOnce(fetchTopicAuthorizedOperationsStub);
      sinon.assert.calledOnceWithExactly(showErrorMessageStub,
        `You do not have permission to delete the topic "${mockLocalKafkaTopic.name}"`
      );
      sinon.assert.notCalled(showInputBoxStub);
      sinon.assert.notCalled(deleteKafkaTopicStub);
    });

     it("should not proceed if topic is not KafkaTopic instance", async () => {
      await deleteTopicCommand({ name: "not-a-kafka-topic" } as any);

      sinon.assert.notCalled(fetchTopicAuthorizedOperationsStub);
      sinon.assert.notCalled(showInputBoxStub);
      sinon.assert.notCalled(deleteKafkaTopicStub);
    });
  });
});
