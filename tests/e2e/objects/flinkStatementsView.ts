import { Page, Locator } from "@playwright/test";
import { TreeView } from "./treeView";

/**
 * Represents the "Flink Statements" view within the Confluent extension.
 */
export class FlinkStatementsView extends TreeView {
  private constructor(page: Page, parentContainerLocator: Locator) {
    // Assuming the view title in the UI is "Flink Statements"
    super(page, "Flink Statements", parentContainerLocator);
  }

  /**
   * Creates an instance of FlinkStatementsView.
   * @param page The Playwright Page object.
   * @param parentContainerLocator The Playwright Locator for the parent container (e.g. Confluent view container).
   * @returns A new instance of FlinkStatementsView.
   */
  public static from(page: Page, parentContainerLocator: Locator): FlinkStatementsView {
    return new FlinkStatementsView(page, parentContainerLocator);
  }

  /**
   * Clicks the "Submit Flink Statement" button within this view.
   */
  public async clickSubmitStatement(): Promise<void> {
    // Assuming this button is directly within or closely associated with the view's main locator
    await this.viewLocator.getByRole('button', { name: 'Submit Flink Statement' }).click();
  }

  // Add any other specific methods for the Flink Statements view here if needed in the future
}
