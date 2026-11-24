import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class TwoFactorPage extends BasePage {
  readonly path = '/two_factor';
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly nextButton: Locator;
  readonly displayedCode: Locator;
  readonly codeInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.displayedCode = page.locator('#otp-code');
    this.codeInput = page.getByLabel('One-time code');
    this.verifyButton = page.getByRole('button', { name: 'Verify' });
  }

  async submitCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.nextButton.click();
  }

  /** Reads the one-time code the demo app prints on screen (it stands in for an SMS). */
  async readOneTimeCode(): Promise<string> {
    return (await this.displayedCode.innerText()).trim();
  }

  async submitCode(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await this.verifyButton.click();
  }
}
