import * as assert from "assert";

import { ThemeIcon } from "vscode";
import {
  createFlinkStatement,
  TEST_CCLOUD_FLINK_STATEMENT,
} from "../../tests/unit/testResources/flinkStatement";
import { SqlV1StatementStatus } from "../clients/flinkSql";
import { IconNames } from "../constants";
import {
  FlinkStatement,
  FlinkStatementTreeItem,
  Phase,
  STATUS_BLUE,
  STATUS_GRAY,
  STATUS_GREEN,
  STATUS_RED,
  STATUS_YELLOW,
  TERMINAL_PHASES,
} from "./flinkStatement";
import { CustomMarkdownString, KeyValuePairArray } from "./main";
import { EnvironmentId } from "./resource";

describe("FlinkStatement", () => {
  it("uses env+name as id", () => {
    const statement = createFlinkStatement({
      name: "statement0",
      environmentId: "env0" as EnvironmentId,
    });

    assert.strictEqual(statement.id, "statement0@env0", "Expected id to be made of name@env");
  });

  it("should construct the right CCloud URL", () => {
    const statement = createFlinkStatement({
      name: "statement0",
      environmentId: "env0" as EnvironmentId,
      computePoolId: "pool0",
    });

    const expectedUrl =
      "https://confluent.cloud/environments/env0/flink/statements/statement0/activity?utm_source=vscode-ext";
    assert.strictEqual(statement.ccloudUrl, expectedUrl, "Expected ccloudUrl to be correct");
  });

  it("isTerminal returns true for terminal phases", () => {
    for (const phase of TERMINAL_PHASES) {
      const statement = createFlinkStatement({ phase });
      assert.strictEqual(statement.isTerminal, true, `Expected ${phase} to be terminal`);
    }

    // not necessarily all the nonterminal phases, but enough to prove the point.
    const nonTerminalPhases = [Phase.RUNNING, Phase.DEGRADED, Phase.PENDING, Phase.FAILING];
    for (const phase of nonTerminalPhases) {
      const statement = createFlinkStatement({ phase });
      assert.strictEqual(statement.isTerminal, false, `Expected ${phase} to not be terminal`);
    }
  });

  describe("isUpdatedMoreRecentlyThan()", () => {
    const staleStatement = createFlinkStatement({ updatedAt: new Date("2023-01-01T00:00:00Z") });
    const freshStatement = createFlinkStatement({ updatedAt: new Date("2023-01-02T00:00:00Z") });

    it("returns true if the statement is fresher", () => {
      assert.strictEqual(
        freshStatement.isUpdatedMoreRecentlyThan(staleStatement),
        true,
        "Expected fresh statement to be fresher than stale statement",
      );
    });

    it("returns false if the statement is not fresher", () => {
      assert.strictEqual(
        staleStatement.isUpdatedMoreRecentlyThan(freshStatement),
        false,
        "Expected stale statement to not be fresher than fresh statement",
      );
    });

    it("returns faluse if statement is the same", () => {
      assert.strictEqual(
        freshStatement.isUpdatedMoreRecentlyThan(freshStatement),
        false,
        "Expected statement to not be fresher than itself",
      );
    });

    it("Throws if the statement ids are not the same", () => {
      const differentIdStatement = createFlinkStatement({
        name: "someOtherStatement",
        environmentId: "env1" as EnvironmentId,
      });

      assert.throws(
        () => {
          freshStatement.isUpdatedMoreRecentlyThan(differentIdStatement);
        },
        {
          message: `Cannot compare FlinkStatement "${freshStatement.id}" with instance with different id "${differentIdStatement.id}"`,
        },
      );
    });
  });

  describe("update()", () => {
    it("properly updates metadata, status, and spec when given revised instance same name/env", () => {
      const statement = createFlinkStatement({
        name: "statement0",
        environmentId: "env0" as EnvironmentId,
        computePoolId: "pool0",

        phase: Phase.RUNNING,
        detail: "Statement is running",
        sqlKind: "SELECT",
        updatedAt: new Date("2023-01-01T00:00:00Z"),
      });

      const updateWith = createFlinkStatement({
        name: "statement0",
        environmentId: "env0" as EnvironmentId,

        // in spec, as if the user updated the statement and changed the compute pool.
        computePoolId: "pool12",

        // these three in status.
        phase: Phase.COMPLETED,
        detail: "Statement is completed",
        sqlKind: "SELECT",

        // a day later, stored in metadata.
        updatedAt: new Date("2023-01-02T00:00:00Z"),
      });
      statement.update(updateWith);
      assert.strictEqual(statement.name, updateWith.name);
      assert.strictEqual(statement.environmentId, updateWith.environmentId);
      assert.strictEqual(statement.computePoolId, updateWith.computePoolId);
      assert.strictEqual(statement.phase, updateWith.phase);
      assert.strictEqual(statement.status.detail, updateWith.status.detail);
      assert.strictEqual(statement.sqlKind, updateWith.sqlKind);
      assert.strictEqual(statement.sqlStatement, updateWith.sqlStatement);
      assert.strictEqual(statement.updatedAt?.toString(), updateWith.updatedAt?.toString());
      assert.strictEqual(statement.createdAt?.toString(), updateWith.createdAt?.toString());
    });

    it("throws if name is not the same", () => {
      const statement = createFlinkStatement({ name: "statement0" });
      const updateWith = createFlinkStatement({ name: "statement1" });

      assert.throws(
        () => {
          statement.update(updateWith);
        },
        {
          message:
            'Cannot update FlinkStatement "statement0" with instance with different name statement1 or environmentId env-abc123',
        },
      );
    });

    it("throws if environmentId is not the same", () => {
      const statement = createFlinkStatement({ name: "statement0" });
      const updateWith = createFlinkStatement({
        name: "statement0",
        environmentId: "env1" as EnvironmentId,
      });

      assert.throws(
        () => {
          statement.update(updateWith);
        },
        {
          message:
            'Cannot update FlinkStatement "statement0" with instance with different name statement0 or environmentId env1',
        },
      );
    });
  });

  describe("areResultsViewable", () => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date();
    const yesterday = new Date(now.getTime() - ONE_DAY_MS * 1.5);
    const today = new Date(now.getTime() - ONE_DAY_MS * 0.5);

    const testCases = [
      {
        name: "should be viewable when statement is RUNNING and less than a day old",
        statement: {
          phase: Phase.RUNNING,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: true,
      },
      {
        name: "should not be viewable when statement is RUNNING but more than a day old",
        statement: {
          phase: Phase.RUNNING,
          sqlKind: "SELECT",
          createdAt: yesterday,
        },
        expected: false,
      },
      {
        name: "should be viewable when statement is PENDING and less than a day old",
        statement: {
          phase: Phase.PENDING,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: true,
      },
      {
        name: "should be viewable when statement is COMPLETED and less than a day old",
        statement: {
          phase: Phase.COMPLETED,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: true,
      },
      {
        name: "should be viewable when statement is INSERT_INTO",
        statement: {
          phase: Phase.RUNNING,
          sqlKind: "INSERT_INTO",
          createdAt: today,
        },
        expected: true,
      },
      {
        name: "should not be viewable when statement is FAILED",
        statement: {
          phase: Phase.FAILED,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: false,
      },
      {
        name: "should not be viewable when statement is STOPPED",
        statement: {
          phase: Phase.STOPPED,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: false,
      },
      {
        name: "should not be viewable when statement is STOPPING",
        statement: {
          phase: Phase.STOPPING,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: false,
      },
      {
        name: "should not be viewable when statement is DELETING",
        statement: {
          phase: Phase.DELETING,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: false,
      },
      {
        name: "should not be viewable when statement is FAILING",
        statement: {
          phase: Phase.FAILING,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: false,
      },
      {
        name: "should not be viewable when statement is DEGRADED",
        statement: {
          phase: Phase.DEGRADED,
          sqlKind: "SELECT",
          createdAt: today,
        },
        expected: false,
      },
    ];

    testCases.forEach(({ name, statement, expected }) => {
      it(name, () => {
        const flinkStatement = createFlinkStatement({
          phase: statement.phase,
          sqlKind: statement.sqlKind,
          createdAt: statement.createdAt,
        });
        assert.strictEqual(flinkStatement.areResultsViewable, expected);
      });
    });
  });
});

describe("FlinkStatementTreeItem", () => {
  // Prove context value is "ccloud-flink-statement"
  it("has the correct context value", () => {
    const statement = TEST_CCLOUD_FLINK_STATEMENT;

    const treeItem = new FlinkStatementTreeItem(statement);
    assert.strictEqual(treeItem.contextValue, "ccloud-flink-statement");
  });

  it("tooltip hits the major properties", () => {
    const statement = createFlinkStatement({
      name: "statement0",
      phase: Phase.RUNNING,
      detail: "Statement is running",
      sqlKind: "SELECT",
      environmentId: "env0" as EnvironmentId,
      computePoolId: "pool0",
    });

    const treeItem = new FlinkStatementTreeItem(statement);
    const tooltip = treeItem.tooltip as CustomMarkdownString;

    const expectedKeyValuePairs: KeyValuePairArray = [
      ["Kind", statement.sqlKindDisplay],
      ["Status", statement.phase],
      ["Created At", statement.createdAt!.toLocaleString()],
      ["Updated At", statement.updatedAt!.toLocaleString()],
      ["Environment", statement.environmentId],
      ["Compute Pool", statement.computePoolId],
      ["Detail", statement.status.detail],
    ];

    for (const [key, value] of expectedKeyValuePairs) {
      assert.ok(tooltip.value.includes(key), `expected key ${key} to be in tooltip`);
      assert.ok(
        tooltip.value.includes(value!),
        `expected value ${value} to be in tooltip for key ${key}\n${tooltip.value}`,
      );
    }
  });

  describe("icon tests", () => {
    it("should use the correct icons and colors based on the `phase`", () => {
      for (const phase of [Phase.FAILED, Phase.FAILING]) {
        const failStatement = new FlinkStatement({
          ...TEST_CCLOUD_FLINK_STATEMENT,
          status: makeStatus(phase),
        });
        const failTreeItem = new FlinkStatementTreeItem(failStatement);
        const failIcon = failTreeItem.iconPath as ThemeIcon;
        assert.strictEqual(failIcon.id, IconNames.FLINK_STATEMENT_STATUS_FAILED);
        assert.strictEqual(failIcon.color, STATUS_RED);
      }

      const degradedStatement = new FlinkStatement({
        ...TEST_CCLOUD_FLINK_STATEMENT,
        status: makeStatus(Phase.DEGRADED),
      });
      const degradedTreeItem = new FlinkStatementTreeItem(degradedStatement);
      const degradedIcon = degradedTreeItem.iconPath as ThemeIcon;
      assert.strictEqual(degradedIcon.id, IconNames.FLINK_STATEMENT_STATUS_DEGRADED);
      assert.strictEqual(degradedIcon.color, STATUS_YELLOW);

      const runningStatement = new FlinkStatement({
        ...TEST_CCLOUD_FLINK_STATEMENT,
        status: makeStatus(Phase.RUNNING),
      });
      const runningTreeItem = new FlinkStatementTreeItem(runningStatement);
      const runningIcon = runningTreeItem.iconPath as ThemeIcon;
      assert.strictEqual(runningIcon.id, IconNames.FLINK_STATEMENT_STATUS_RUNNING);
      assert.strictEqual(runningIcon.color, STATUS_GREEN);

      const completedStatement = new FlinkStatement({
        ...TEST_CCLOUD_FLINK_STATEMENT,
        status: makeStatus(Phase.COMPLETED),
      });
      const completedTreeItem = new FlinkStatementTreeItem(completedStatement);
      const completedIcon = completedTreeItem.iconPath as ThemeIcon;
      assert.strictEqual(completedIcon.id, IconNames.FLINK_STATEMENT_STATUS_COMPLETED);
      assert.strictEqual(completedIcon.color, STATUS_GRAY);

      for (const phase of [Phase.DELETING, Phase.STOPPING]) {
        const stopStatement = new FlinkStatement({
          ...TEST_CCLOUD_FLINK_STATEMENT,
          status: makeStatus(phase),
        });
        const stopTreeItem = new FlinkStatementTreeItem(stopStatement);
        const stopIcon = stopTreeItem.iconPath as ThemeIcon;
        assert.strictEqual(stopIcon.id, IconNames.FLINK_STATEMENT_STATUS_DELETING);
        assert.strictEqual(stopIcon.color, STATUS_GRAY);
      }

      const stoppedStatement = new FlinkStatement({
        ...TEST_CCLOUD_FLINK_STATEMENT,
        status: makeStatus(Phase.STOPPED),
      });
      const stoppedTreeItem = new FlinkStatementTreeItem(stoppedStatement);
      const stoppedIcon = stoppedTreeItem.iconPath as ThemeIcon;
      assert.strictEqual(stoppedIcon.id, IconNames.FLINK_STATEMENT_STATUS_STOPPED);
      assert.strictEqual(stoppedIcon.color, STATUS_BLUE);

      const pendingStatement = new FlinkStatement({
        ...TEST_CCLOUD_FLINK_STATEMENT,
        status: makeStatus(Phase.PENDING),
      });
      const pendingTreeItem = new FlinkStatementTreeItem(pendingStatement);
      const pendingIcon = pendingTreeItem.iconPath as ThemeIcon;
      assert.strictEqual(pendingIcon.id, IconNames.FLINK_STATEMENT_STATUS_PENDING);
      assert.strictEqual(pendingIcon.color, STATUS_BLUE);
    });

    it("should fall back to a basic icon for untracked phase values", () => {
      const unknownStatement = new FlinkStatement({
        ...TEST_CCLOUD_FLINK_STATEMENT,
        status: makeStatus("UNKNOWN" as Phase),
      });
      const unknownTreeItem = new FlinkStatementTreeItem(unknownStatement);
      const unknownIcon = unknownTreeItem.iconPath as ThemeIcon;
      assert.strictEqual(unknownIcon.id, IconNames.FLINK_STATEMENT);
      assert.strictEqual(unknownIcon.color, undefined);
    });
  });
});

function makeStatus(phase: Phase): SqlV1StatementStatus {
  return createFlinkStatement({ phase: phase }).status;
}
