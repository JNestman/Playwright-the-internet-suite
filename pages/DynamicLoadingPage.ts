import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DynamicLoadingPage extends BasePage {
  readonly path: string;
  readonly startButton: Locator;
  readonly loadingIndicator: Locator;
  readonly finishText: Locator;

  constructor(page: Page, example: 1 | 2) {
    super(page);
    this.path = `/dynamic_loading/${example}`;
    this.startButton = page.locator('#start').getByRole('button', { name: 'Start' });
    this.loadingIndicator = page.locator('#loading');
    this.finishText = page.locator('#finish');
  }

  async start(): Promise<void> {
    await this.startButton.click();
  }
}
