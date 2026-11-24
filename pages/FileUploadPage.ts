import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

type UploadFile = string | { name: string; mimeType: string; buffer: Buffer };

export class FileUploadPage extends BasePage {
  readonly path = '/upload';
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly uploadedFiles: Locator;
  readonly dropZone: Locator;

  constructor(page: Page) {
    super(page);
    this.fileInput = page.locator('#file-upload');
    this.uploadButton = page.locator('#file-submit');
    this.uploadedFiles = page.locator('#uploaded-files');
    this.dropZone = page.locator('#drag-drop-upload');
  }

  async upload(file: UploadFile): Promise<void> {
    await this.fileInput.setInputFiles(file);
    await this.uploadButton.click();
  }
}
