import { Page, Locator } from "@playwright/test";
import { isExpanded, expand, collapse } from "../utils/expansion";

/**
 * Represents a generic item within a TreeView in VS Code.
 * Provides methods to interact with the tree item.
 */
export class ViewItem {
  private readonly itemLocator: Locator;
  private readonly page: Page;

  private constructor(locator: Locator, page: Page) {
    this.itemLocator = locator;
    this.page = page;
  }

  /**
   * Creates an instance of ViewItem.
   * @param locator The Playwright Locator for the tree item.
   * @param page The Playwright Page object.
   * @returns A new instance of ViewItem.
   */
  public static from(locator: Locator, page: Page): ViewItem {
    return new ViewItem(locator, page);
  }

  /**
   * Clicks the view item.
   */
  public async click(): Promise<void> {
    await this.itemLocator.click();
  }

  /**
   * Gets the text content of the view item.
   * @returns The text content of the item.
   */
  public async getText(): Promise<string> {
    return this.itemLocator.textContent() || "";
  }

  /**
   * Checks if the view item is currently visible.
   * @returns True if the item is visible, false otherwise.
   */
  public async isVisible(): Promise<boolean> {
    return this.itemLocator.isVisible();
  }

  /**
   * Checks if the view item is expanded (if it's a collapsible item).
   * This assumes the item is a tree item and uses 'aria-expanded' attribute.
   * @returns True if the item is expanded, false otherwise or if not applicable.
   */
  public async isExpanded(): Promise<boolean> {
    return isExpanded(this.itemLocator);
  }

  /**
   * Expands the view item if it is collapsible and not already expanded.
   * Does nothing if the item is already expanded or not expandable.
   */
  public async expand(): Promise<void> {
    await expand(this.itemLocator);
  }

  /**
   * Collapses the view item if it is collapsible and expanded.
   * Does nothing if the item is already collapsed or not expandable.
   */
  public async collapse(): Promise<void> {
    await collapse(this.itemLocator);
  }

  /**
   * Hovers over the view item.
   */
  public async hover(): Promise<void> {
    await this.itemLocator.hover();
  }

  /**
   * Gets a Playwright Locator for a specific action button within this item.
   * For example, a 'play' button or 'delete' button that appears on hover.
   * @param label The aria-label or title of the action button.
   * @returns A Playwright Locator for the action button.
   */
  public getActionButton(label: string): Locator {
    // This is a generic way to find action buttons.
    // It might need to be adjusted based on how these buttons are implemented in VS Code.
    // It tries to find a button or an element with a role 'button' by its aria-label.
    return this.itemLocator.locator(`[aria-label="${label}"], [title="${label}"]`).first();
  }

  /**
   * Right-clicks the view item to open its context menu.
   * @returns A Playwright Locator representing the context menu.
   *          This locator can be used to find items within the context menu.
   *          Note: Interacting with the context menu itself might require specific selectors
   *          depending on how VS Code renders it (e.g., looking for role 'menu' or 'menuitem').
   */
  public async getContextMenu(): Promise<Locator> {
    await this.itemLocator.click({ button: "right" });
    // Return a locator for the context menu. This is often a global element.
    // The selector `div[role="menu"]` is a common way to find context menus.
    return this.page.locator('div[role="menu"]').first();
  }

  /**
   * Gets the Playwright Locator for this view item.
   */
  public getlocator(): Locator {
    return this.itemLocator;
  }
}
