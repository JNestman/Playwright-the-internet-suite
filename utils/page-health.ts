import { type Page } from '@playwright/test';

export interface BrokenImage {
  src: string;
  status: number | null;
}

/**
 * Returns every <img> on the page that failed to load, with the HTTP status of its source.
 * An image counts as broken when the browser finished loading it but it has no natural width.
 */
export async function findBrokenImages(page: Page): Promise<BrokenImage[]> {
  const sources = await page.locator('img').evaluateAll((imgs) =>
    (imgs as HTMLImageElement[]).filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src),
  );

  const results: BrokenImage[] = [];
  for (const src of sources) {
    const response = await page.request.get(src).catch(() => null);
    results.push({ src, status: response?.status() ?? null });
  }
  return results;
}

/** Reads a CSS ::before/::after `content` value, e.g. labels drawn by media queries. */
export async function pseudoContent(page: Page, selector: string, pseudo: '::before' | '::after'): Promise<string> {
  return page
    .locator(selector)
    .evaluate((el, p) => getComputedStyle(el, p).content.replace(/^"|"$/g, ''), pseudo);
}
