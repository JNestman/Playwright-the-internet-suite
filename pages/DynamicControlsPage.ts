import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DynamicControlsPage extends BasePage {
  readonly path = '/dynamic_controls';
  readonly checkbox: Locator;
  readonly checkboxToggleButton: Locator;
  readonly textInput: Locator;
  readonly inputToggleButton: Locator;
  readonly message: Locator;

  constructor(page: Page) {
    super(page);
    const checkboxForm = page.locator('#checkbox-example');
    const inputForm = page.locator('#input-example');
    this.checkbox = checkboxForm.getByRole('checkbox');
    this.checkboxToggleButton = checkboxForm.getByRole('button');
    this.textInput = inputForm.getByRole('textbox');
    this.inputToggleButton = inputForm.getByRole('button');
    this.message = page.locator('#message');
  }
}
