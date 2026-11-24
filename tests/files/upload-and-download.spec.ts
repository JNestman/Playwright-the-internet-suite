import { test, expect } from '../../fixtures/test';
import { httpAuth } from '../../test-data/users';
import { readFile } from 'node:fs/promises';

/**
 * File upload (input and drag-and-drop zone) and downloads from plain links,
 * links behind HTTP auth, Blob/data URLs and Content-Disposition headers.
 * Test files are generated in memory, so the suite needs no fixture files on disk.
 */

const uniqueName = (ext: string) => `playwright-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;

test.describe('File upload', () => {
  test.beforeEach(async ({ uploadPage }) => {
    await uploadPage.goto();
  });

  test('user uploads a document through the file picker @smoke', async ({ page, uploadPage }) => {
    const name = uniqueName('txt');
    await uploadPage.upload({ name, mimeType: 'text/plain', buffer: Buffer.from('Invoice #1001\nTotal: $42.00\n') });

    await expect(page.getByRole('heading', { name: 'File Uploaded!' })).toBeVisible();
    await expect(uploadPage.uploadedFiles).toHaveText(name);
  });

  test('user uploads a file through the drag-and-drop zone', async ({ page, uploadPage }) => {
    const name = uniqueName('csv');
    // Dropzone keeps a hidden <input type=file>; setting it is equivalent to dropping a file.
    await page.locator('input.dz-hidden-input').setInputFiles({
      name,
      mimeType: 'text/csv',
      buffer: Buffer.from('sku,qty\nA-1,3\n'),
    });

    await expect(uploadPage.dropZone.locator('.dz-preview .dz-filename span')).toHaveText(name);
    await expect(uploadPage.dropZone.locator('.dz-preview')).toHaveClass(/dz-success/);
  });

  test('uploaded file can be downloaded again with identical content', async ({ page, uploadPage }) => {
    const name = uniqueName('txt');
    const content = `Round-trip check ${Date.now()}`;
    await uploadPage.upload({ name, mimeType: 'text/plain', buffer: Buffer.from(content) });
    await expect(uploadPage.uploadedFiles).toHaveText(name);

    await page.goto('/download');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name, exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(name);
    expect(await readFile(await download.path(), 'utf8')).toBe(content);
  });
});

test.describe('File download', () => {
  test('download page lists files and each link serves a file', async ({ page, request }) => {
    await page.goto('/download');
    const links = page.locator('.example a');
    expect(await links.count()).toBeGreaterThan(0);

    // Check the first few links over HTTP rather than downloading each one through the UI.
    for (const href of (await links.evaluateAll((els) => els.map((a) => a.getAttribute('href')!))).slice(0, 5)) {
      const response = await request.get(`/${href}`);
      expect(response.status(), href).toBe(200);
    }
  });

  test('clicking a file link starts a download with the expected file name', async ({ page }) => {
    await page.goto('/download');
    const firstLink = page.locator('.example a').first();
    const name = (await firstLink.innerText()).trim();

    const downloadPromise = page.waitForEvent('download');
    await firstLink.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(name);
    expect(await download.failure()).toBeNull();
  });
});

test.describe('Secure file download', () => {
  test.describe('with credentials', () => {
    test.use({ httpCredentials: httpAuth.valid });

    test('authorised user can download a protected file', async ({ page }) => {
      await page.goto('/download_secure');
      const firstLink = page.locator('.example a').first();
      const name = (await firstLink.innerText()).trim();

      const downloadPromise = page.waitForEvent('download');
      await firstLink.click();

      expect((await downloadPromise).suggestedFilename()).toBe(name);
    });
  });

  test('anonymous user is refused', async ({ request }) => {
    const response = await request.get('/download_secure');
    expect(response.status()).toBe(401);
  });
});

test.describe('Modern file download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/download_modern');
  });

  test('CSV generated in the browser (Blob) downloads with the right content', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download a CSV made with a Blob' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('report.csv');
    expect(await readFile(await download.path(), 'utf8')).toBe('name,count\napple,3\nbanana,5\n');
    await expect(page.locator('#download-status')).toHaveText(/^Saved report\.csv \(\d+ bytes, text\/csv\)$/);
  });

  test('fetched JSON is saved using the server-provided file name', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Fetch JSON, then save it' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.json$/);
    const body = await readFile(await download.path(), 'utf8');
    expect(() => JSON.parse(body)).not.toThrow();
  });

  test('data URL link downloads hello.txt', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download from a data URL' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('hello.txt');
    expect(await readFile(await download.path(), 'utf8')).toBe('Hello from a data URL\n');
  });

  const dispositionCases = [
    { link: 'résumé.txt', expected: 'résumé.txt', why: 'UTF-8 file name via filename*' },
    { link: 'my report 2026.txt', expected: 'my report 2026.txt', why: 'spaces in the file name' },
  ];
  for (const { link, expected, why } of dispositionCases) {
    test(`Content-Disposition with ${why} is honoured`, async ({ page }) => {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('link', { name: link }).click();

      expect((await downloadPromise).suggestedFilename()).toBe(expected);
    });
  }

  test('inline Content-Disposition opens in the browser instead of downloading', async ({ request }) => {
    const response = await request.get('/download_modern/file/inline');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-disposition']).toMatch(/^inline/);
  });
});
