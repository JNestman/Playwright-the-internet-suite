import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly path = '/login';
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}

export class SecureAreaPage extends BasePage {
  readonly path = '/secure';
  readonly loggedInUser: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.loggedInUser = page.locator('#username');
    this.logoutButton = page.getByRole('link', { name: 'Logout' });
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
