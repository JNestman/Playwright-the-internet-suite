import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly path = '/';
  readonly filterInput: Locator;
  readonly exampleLinks: Locator;
  readonly visibleExamples: Locator;
  readonly noMatchesMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.filterInput = page.getByLabel('Filter examples');
    this.exampleLinks = page.locator('#content ul li a');
    this.visibleExamples = page.locator('#content ul li:not([hidden])');
    this.noMatchesMessage = page.locator('#example-filter-empty');
  }

  async filterExamples(term: string): Promise<void> {
    await this.filterInput.fill(term);
  }

  async openExample(name: string): Promise<void> {
    await this.page.getByRole('link', { name, exact: true }).click();
  }
}
