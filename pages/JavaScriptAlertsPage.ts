import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class JavaScriptAlertsPage extends BasePage {
  readonly path = '/javascript_alerts';
  readonly alertButton: Locator;
  readonly confirmButton: Locator;
  readonly promptButton: Locator;
  readonly result: Locator;

  constructor(page: Page) {
    super(page);
    this.alertButton = page.getByRole('button', { name: 'Click for JS Alert' });
    this.confirmButton = page.getByRole('button', { name: 'Click for JS Confirm' });
    this.promptButton = page.getByRole('button', { name: 'Click for JS Prompt' });
    this.result = page.locator('#result');
  }

  /**
   * Clicks a button that opens a native dialog, answers it and returns the dialog text.
   * `answer`: true = accept, false = dismiss, string = accept a prompt with that text.
   */
  async triggerAndRespond(button: Locator, answer: boolean | string): Promise<string> {
    const dialogPromise = this.page.waitForEvent('dialog');
    const clickPromise = button.click();
    const dialog = await dialogPromise;
    const message = dialog.message();
    if (answer === false) await dialog.dismiss();
    else await dialog.accept(typeof answer === 'string' ? answer : undefined);
    await clickPromise;
    return message;
  }
}
