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
   * Focuses on the tree view, ensuring it is visible and expanded.
   * This typically involves hovering over the view's header and clicking it
   * to make it active or expand it if it's a collapsible section.
   */
  public async focus(): Promise<void> {
    // First, ensure the view container itself is visible (the TreeView is part of a larger container)
    // This check might be implicitly handled if parentContainerLocator is used correctly,
    // but an explicit check on viewLocator can be good.
    await this.viewLocator.waitFor({ state: 'visible', timeout: 5000 });

    // The viewLocator is for the div[role="tree"]. The clickable header is likely an h3 within it or sibling to it.
    // Let's assume the h3 element with the viewName is what needs to be clicked to expand/focus.
    // This selector might need refinement based on actual DOM.
    const viewHeaderLocator = this.viewLocator.locator(`xpath=./ancestor::div[contains(@class, 'pane')]//h3[contains(., '${this.viewName}')] | ./h3[contains(., '${this.viewName}')]`);

    if (!(await viewHeaderLocator.isVisible())) {
      // If the header isn't visible, the view might be scrolled out of view or in a collapsed parent.
      // This simple focus won't handle complex scrolling scenarios, but will try to click if found.
      // Fallback to ensure the general view area is at least hovered.
      await this.viewLocator.hover();
    } else {
      await viewHeaderLocator.hover();
      // Click to expand/focus. For VS Code sections, clicking the header title usually toggles expansion.
      // We need to check if it's already expanded (e.g., aria-expanded on the parent element or button).
      // For simplicity here, we'll click. A more robust solution would check 'aria-expanded' on the section header's button if available.
      await viewHeaderLocator.click();
    }

    // Add a small wait to ensure any associated UI updates (like loading items) can occur.
    await this.page.waitForTimeout(200); // Arbitrary small delay
  }
}
