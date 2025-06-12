import { Locator } from "@playwright/test";

/**
 * Checks if a UI element is currently expanded.
 * It relies on the 'aria-expanded' attribute.
 * @param locator The Playwright Locator for the element.
 * @returns True if the element is expanded, false otherwise or if attribute is not present.
 */
export async function isExpanded(locator: Locator): Promise<boolean> {
  return (await locator.getAttribute("aria-expanded")) === "true";
}

/**
 * Expands a UI element if it is currently collapsed.
 * Clicks the element if 'aria-expanded' is "false".
 * Does nothing if the element is already expanded or does not have 'aria-expanded' attribute.
 * @param locator The Playwright Locator for the element.
 */
export async function expand(locator: Locator): Promise<void> {
  if (await locator.getAttribute("aria-expanded") === "false") {
    await locator.click();
  }
}

/**
 * Collapses a UI element if it is currently expanded.
 * Clicks the element if 'aria-expanded' is "true".
 * Does nothing if the element is already collapsed or does not have 'aria-expanded' attribute.
 * @param locator The Playwright Locator for the element.
 */
export async function collapse(locator: Locator): Promise<void> {
  if (await locator.getAttribute("aria-expanded") === "true") {
    await locator.click();
  }
}
