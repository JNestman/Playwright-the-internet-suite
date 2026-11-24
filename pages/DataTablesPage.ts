import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type TableId = 'table1' | 'table2';
export type TableColumn = 'Last Name' | 'First Name' | 'Email' | 'Due' | 'Web Site';

/** Page object for /tables. Reads cells by header name so tests don't depend on column order. */
export class DataTablesPage extends BasePage {
  readonly path = '/tables';

  constructor(page: Page) {
    super(page);
  }

  table(id: TableId): Locator {
    return this.page.locator(`#${id}`);
  }

  async sortBy(id: TableId, column: TableColumn): Promise<void> {
    await this.table(id).locator('thead th', { hasText: column }).click();
  }

  private async headers(id: TableId): Promise<string[]> {
    return (await this.table(id).locator('thead th').allInnerTexts()).map((h) => h.trim());
  }

  async columnValues(id: TableId, column: TableColumn): Promise<string[]> {
    const index = (await this.headers(id)).indexOf(column);
    if (index < 0) throw new Error(`Column "${column}" not found in #${id}`);
    const cells = await this.table(id).locator(`tbody tr td:nth-child(${index + 1})`).allInnerTexts();
    return cells.map((c) => c.trim());
  }

  async rowByEmail(id: TableId, email: string): Promise<Record<string, string>> {
    const headers = await this.headers(id);
    const cells = await this.table(id).locator('tbody tr', { hasText: email }).locator('td').allInnerTexts();
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()]));
  }
}
