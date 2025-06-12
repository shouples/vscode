import { Page, Locator } from "@playwright/test";
import { TreeView } from "./treeView";

/**
 * Represents the "Resources" view within the Confluent extension.
 */
export class ResourcesView extends TreeView {
  private constructor(page: Page, parentContainerLocator: Locator) {
    super(page, "Resources", parentContainerLocator);
  }

  /**
   * Creates an instance of ResourcesView.
   * @param page The Playwright Page object.
   * @param parentContainerLocator The Playwright Locator for the parent container (e.g. Confluent view container).
   * @returns A new instance of ResourcesView.
   */
  public static from(page: Page, parentContainerLocator: Locator): ResourcesView {
    return new ResourcesView(page, parentContainerLocator);
  }

  /**
   * Clicks the "Add New Connection" button/action within this view.
   */
  public async clickAddNewConnection(): Promise<void> {
    // Assuming this action is within the ResourcesView's context
    await this.viewLocator.getByLabel("Add New Connection").click();
  }
  // Add any specific methods for the Resources view here if needed in the future
}
