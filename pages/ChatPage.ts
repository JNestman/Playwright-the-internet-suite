import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ChatPage extends BasePage {
  readonly path = '/chat';
  readonly status: Locator;
  readonly nameInput: Locator;
  readonly joinButton: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messages: Locator;
  readonly notices: Locator;

  constructor(page: Page) {
    super(page);
    this.status = page.locator('#status');
    this.nameInput = page.locator('#name');
    this.joinButton = page.getByRole('button', { name: 'Join' });
    this.messageInput = page.locator('#message');
    this.sendButton = page.getByRole('button', { name: 'Send' });
    this.messages = page.locator('#messages li.message');
    this.notices = page.locator('#messages li.notice');
  }

  /** Opens an isolated room so parallel test runs never see each other's messages. */
  async openRoom(room: string): Promise<void> {
    await this.goto(`?room=${room}`);
    await expect(this.status).toHaveText('Connected');
  }

  async join(name: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.joinButton.click();
    await expect(this.messageInput).toBeEnabled();
  }

  async send(text: string): Promise<void> {
    await this.messageInput.fill(text);
    await this.sendButton.click();
  }
}
