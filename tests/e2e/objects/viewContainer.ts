import { Page, Locator } from "@playwright/test";

/**
 * Represents the 'Confluent' view container in VS Code.
 * Provides methods to interact with this specific container.
 */
export class ViewContainer {
  private readonly page: Page;
  private readonly containerLocator: Locator;

  private constructor(page: Page) {
    this.page = page;
    // Assuming the view container is identifiable by a tab with the name "Confluent"
    this.containerLocator = page.getByRole("tab", { name: "Confluent" }).locator("a").first();
  }

  /**
   * Creates an instance of ViewContainer.
   * @param page The Playwright Page object.
   * @returns A new instance of ViewContainer.
   */
  public static from(page: Page): ViewContainer {
    return new ViewContainer(page);
  }

  /**
   * Checks if the view container is currently open (selected/visible).
   * @returns True if the container is open, false otherwise.
   */
  public async isOpen(): Promise<boolean> {
    // A tab is "open" if its parent li element has aria-selected="true"
    const parentLi = this.page.locator("li[role='tab'][aria-label='Confluent']");
    return (await parentLi.getAttribute("aria-selected")) === "true";
  }

  /**
   * Opens the view container by clicking on its tab.
   * It will also wait for some known content to be visible after opening.
   */
  public async open(): Promise<void> {
    if (!(await this.isOpen())) {
      await this.containerLocator.click();
    }
    // Wait for a known element within the container to ensure it's loaded
    // Using "Confluent Cloud" as a placeholder, this might need adjustment
    // based on actual content visible when the extension loads.
    await this.page.getByText("Confluent Cloud").waitFor({
      state: "visible",
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Gets the Playwright Locator for the view container.
   * Useful for chaining other Playwright operations.
   */
  public getlocator(): Locator {
    return this.containerLocator;
  }
}
