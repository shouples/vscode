import { Page, Locator } from "@playwright/test";
import { TreeView } from "./treeView";

/**
 * Represents the "Topics" view within the Confluent extension.
 */
export class TopicsView extends TreeView {
  private constructor(page: Page, parentContainerLocator: Locator) {
    super(page, "Topics", parentContainerLocator);
  }

  /**
   * Creates an instance of TopicsView.
   * @param page The Playwright Page object.
   * @param parentContainerLocator The Playwright Locator for the parent container (e.g. Confluent view container).
   * @returns A new instance of TopicsView.
   */
  public static from(page: Page, parentContainerLocator: Locator): TopicsView {
    return new TopicsView(page, parentContainerLocator);
  }

  // Add any specific methods for the Topics view here if needed in the future
}
