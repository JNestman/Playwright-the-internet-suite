import { type Locator, type Page } from '@playwright/test';

/**
 * Common behaviour shared by every page object.
 * Each page object declares the relative `path` it lives at.
 */
export abstract class BasePage {
  abstract readonly path: string;

  /** The green/red banner the app uses for success and error feedback. */
  readonly flashMessage: Locator;

  constructor(protected readonly page: Page) {
    this.flashMessage = page.locator('#flash');
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(this.path + query);
  }
}
