import { Page } from "@playwright/test";
import { ViewContainer } from "../../objects";

/**
 * Clicks on the Confluent extension to load it. This is meant to be called
 * before any subsequent action is taken place.
 * @param page
 */
export async function openConfluentExtension(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");

  const confluentViewContainer = ViewContainer.from(page);
  await confluentViewContainer.open(); // This method already waits for "Confluent Cloud" text

  // Close any notifications that pop up on load. These make it impossible to
  // interact with UI elements hidden behind them.
  const clearableNotifications = await page.getByLabel(/Clear Notification/).all();
  for (const notification of clearableNotifications) {
    await notification.click();
  }
}
