import { Page, Locator } from "@playwright/test";
import { TreeView } from "./treeView";

/**
 * Represents the "Schemas" view within the Confluent extension.
 */
export class SchemasView extends TreeView {
  private constructor(page: Page, parentContainerLocator: Locator) {
    super(page, "Schemas", parentContainerLocator);
  }

  /**
   * Creates an instance of SchemasView.
   * @param page The Playwright Page object.
   * @param parentContainerLocator The Playwright Locator for the parent container (e.g. Confluent view container).
   * @returns A new instance of SchemasView.
   */
  public static from(page: Page, parentContainerLocator: Locator): SchemasView {
    return new SchemasView(page, parentContainerLocator);
  }

  /**
   * Clicks the "Select Schema Registry" button/action within this view.
   */
  public async clickSelectSchemaRegistry(): Promise<void> {
    // Assuming this action is within the SchemasView's context
    await this.viewLocator.getByLabel("Select Schema Registry").click();
  }

  /**
   * Clicks the "Upload Schema to Schema Registry" button/action within this view.
   */
  public async clickUploadSchema(): Promise<void> {
    // Assuming this action is within the SchemasView's context
    await this.viewLocator.getByLabel("Upload Schema to Schema Registry", { exact: true }).click();
  }
  // Add any specific methods for the Schemas view here if needed in the future
}
