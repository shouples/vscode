import { Page, Locator } from "@playwright/test";
import { ViewItem } from "./viewItem"; // Assuming ViewItem will be in the same directory

/**
 * Represents a generic tree view within the VS Code sidebar.
 * This class is intended to be extended by specific view implementations.
 */
export class TreeView {
  protected readonly page: Page;
  protected readonly viewName: string;
  protected readonly viewLocator: Locator; // Locator for the view itself

  /**
   * Protected constructor for base class.
   * @param page The Playwright Page object.
   * @param viewName The display name of the view (e.g., "Resources", "Topics").
   * @param parentContainerLocator The Playwright Locator for the parent container (e.g. Confluent view container).
   */
  protected constructor(page: Page, viewName: string, parentContainerLocator: Locator) {
    this.page = page;
    this.viewName = viewName;
    // Assuming the view is a section within the parent container, identifiable by a title/header.
    // This selector might need refinement based on the actual DOM structure.
    // It looks for a div with role="tree" that has an h3 header with the viewName.
    this.viewLocator = parentContainerLocator.locator(`div[role="tree"]:has(h3:has-text("${viewName}"))`);
  }

  /**
   * Checks if the tree view is currently visible.
   * @returns True if the view is visible, false otherwise.
   */
  public async isVisible(): Promise<boolean> {
    return this.viewLocator.isVisible();
  }

  /**
   * Finds and returns a ViewItem within this tree view by its name.
   * @param itemName The name of the item to find (can be a string or RegExp).
   * @returns A new instance of ViewItem representing the found item.
   * @throws Error if the item is not found.
   */
  public async getItem(itemName: string | RegExp): Promise<ViewItem> {
    // Assuming tree items are identifiable by text within the view.
    // This locator might need to be more specific, e.g., targeting role="treeitem".
    const itemLocator = this.viewLocator.getByRole('treeitem', { name: itemName }).first();
    await itemLocator.waitFor({ state: "visible", timeout: 10000 }); // Wait for item to be visible
    if (!(await itemLocator.isVisible())) {
      throw new Error(`ViewItem "${itemName}" not found in view "${this.viewName}".`);
    }
    return ViewItem.from(itemLocator, this.page);
  }

  /**
   * Gets all items currently visible in the tree view.
   * @returns A promise that resolves to an array of ViewItem instances.
   */
  public async getAllItems(): Promise<ViewItem[]> {
    // Assuming tree items have a role 'treeitem'
    const itemLocators = await this.viewLocator.getByRole('treeitem').all();
    return itemLocators.map(locator => ViewItem.from(locator, this.page));
  }

  /**
   * Gets the Playwright Locator for this view.
   */
  public getlocator(): Locator {
    return this.viewLocator;
  }
}
