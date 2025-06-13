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

  /**
   * Focuses on the tree view section, ensuring it is visible and expanded.
   * This typically involves finding the view's header (e.g., an H3 element),
   * hovering over it, and clicking it. If the view section appears to be
   * a toggle (e.g., first click collapses an already expanded view),
   * it will attempt a second click to ensure expansion.
   * Waits for the tree content itself to be visible after interaction.
   */
  public async focus(): Promise<void> {
    // Try to find the header element, often an h3 or a button containing the viewName.
    // Let's assume the h3 element itself is (or is within) the clickable area.
    // This locator targets the h3 that is an ancestor of or part of the viewLocator context,
    // or more broadly within the parent container if the view isn't yet visible.
    const headerTitleLocator = this.parentContainerLocator.getByRole('heading', { name: this.viewName, exact: true, level: 3 });

    // It's possible the clickable element is the parent of the h3, or a button.
    // A common VS Code pattern is a div with class 'pane-header' or a button role around the title.
    // For now, we'll try clicking the h3. If it's not directly clickable, this might need adjustment
    // to target its parent or a specific button role.
    // E.g., this.parentContainerLocator.getByRole('button', { name: this.viewName, exact: true });

    await headerTitleLocator.waitFor({ state: 'visible', timeout: 7000 }); // Increased timeout
    await headerTitleLocator.hover();
    await headerTitleLocator.click(); // First click to activate/focus or toggle

    // Check if the associated tree (viewLocator) is now visible.
    // If not, the section might have been collapsed by the first click, so try clicking again.
    // A more robust way is to check aria-expanded on the header if available.
    if (!(await this.viewLocator.isVisible())) {
        // If the tree content isn't visible after the first click, the section might have been initially expanded and then collapsed by the click.
        // Or it was collapsed and the click didn't expand it (less likely for simple toggles).
        // We'll try clicking again. This handles simple toggle behavior.
        await headerTitleLocator.click();
    }

    // Ensure the tree content itself is now visible.
    await this.viewLocator.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(200); // Arbitrary small delay for UI to settle.
  }
}
