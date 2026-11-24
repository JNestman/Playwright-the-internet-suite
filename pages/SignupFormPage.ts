import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface SignupDetails {
  username: string;
  email: string;
  age?: string;
  website?: string;
  password: string;
  acceptTerms?: boolean;
}

type Field = 'username' | 'email' | 'age' | 'website' | 'password' | 'terms';

/** Page object for /form_validation: HTML5 checks in the browser plus server-side errors. */
export class SignupFormPage extends BasePage {
  readonly path = '/form_validation';
  readonly username: Locator;
  readonly email: Locator;
  readonly age: Locator;
  readonly website: Locator;
  readonly password: Locator;
  readonly terms: Locator;
  readonly submitButton: Locator;
  readonly result: Locator;
  /** Server-side error messages that currently have text. */
  readonly visibleFieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.username = page.locator('#username');
    this.email = page.locator('#email');
    this.age = page.locator('#age');
    this.website = page.locator('#website');
    this.password = page.locator('#password');
    this.terms = page.locator('#terms');
    this.submitButton = page.getByRole('button', { name: 'Create account' });
    this.result = page.locator('#result');
    this.visibleFieldErrors = page.locator('.field-error:not(:empty)');
  }

  fieldError(field: Field): Locator {
    return this.page.locator(`#${field}-error`);
  }

  async fill(details: SignupDetails): Promise<void> {
    await this.username.fill(details.username);
    await this.email.fill(details.email);
    if (details.age !== undefined) await this.age.fill(details.age);
    if (details.website !== undefined) await this.website.fill(details.website);
    await this.password.fill(details.password);
    await this.terms.setChecked(details.acceptTerms ?? true);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** The browser's native constraint-validation message for a field ('' when valid). */
  async validationMessage(field: Locator): Promise<string> {
    return field.evaluate((el: HTMLInputElement) => el.validationMessage);
  }

  async isValid(field: Locator): Promise<boolean> {
    return field.evaluate((el: HTMLInputElement) => el.checkValidity());
  }
}
