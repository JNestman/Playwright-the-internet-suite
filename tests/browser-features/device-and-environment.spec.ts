import { test, expect } from '@playwright/test';
import { pseudoContent } from '../../utils/page-health';

/**
 * Behaviour that depends on the browser environment: geolocation, locale,
 * time zone, screen size and cookies. Playwright emulates each of these
 * per browser context, so no real device or VPN is needed.
 */

test.describe('Geolocation', () => {
  test.use({ geolocation: { latitude: 48.8584, longitude: 2.2945 }, permissions: ['geolocation'] });

  test('page shows the coordinates reported by the browser', async ({ page }) => {
    await page.goto('/geolocation');
    await page.getByRole('button', { name: 'Where am I?' }).click();

    await expect(page.locator('#lat-value')).toHaveText('48.8584');
    await expect(page.locator('#long-value')).toHaveText('2.2945');
    await expect(page.getByRole('link', { name: 'See it on Google' })).toHaveAttribute(
      'href',
      'http://maps.google.com/?q=48.8584,2.2945',
    );
  });
});

test.describe('Locale & time zone', () => {
  const locales = [
    { locale: 'de-DE', timezoneId: 'Europe/Berlin', greeting: 'Hallo!', number: '1.234.567,891', price: '1.234,50 €' },
    { locale: 'fr-FR', timezoneId: 'Europe/Paris', greeting: 'Bonjour !', number: '1 234 567,891', price: '1 234,50 €' },
    { locale: 'ja-JP', timezoneId: 'Asia/Tokyo', greeting: 'こんにちは！', number: '1,234,567.891', price: '€1,234.50' },
    { locale: 'en-US', timezoneId: 'America/New_York', greeting: 'Hello!', number: '1,234,567.891', price: '€1,234.50' },
  ];

  for (const l of locales) {
    test.describe(l.locale, () => {
      test.use({ locale: l.locale, timezoneId: l.timezoneId });

      test(`visitor from ${l.locale} gets a localised greeting and number formats`, async ({ page }) => {
        await page.goto('/locale');

        await expect(page.locator('#greeting')).toHaveText(l.greeting);
        await expect(page.locator('#browser-language')).toHaveText(l.locale);
        await expect(page.locator('#browser-timezone')).toHaveText(l.timezoneId);
        // Intl may use narrow no-break spaces as group separators; normalise them before comparing.
        const normalise = (s: string) => s.replace(/[  ]/g, ' ');
        expect(normalise(await page.locator('#formatted-number').innerText())).toBe(l.number);
        expect(normalise(await page.locator('#formatted-price').innerText())).toBe(l.price);
      });
    });
  }

  test.describe('time zone conversion', () => {
    test.use({ locale: 'en-GB', timezoneId: 'Asia/Tokyo' });

    test('fixed UTC timestamp is shown in the visitor time zone', async ({ page }) => {
      await page.goto('/locale');
      // 2026-04-15 12:00 UTC is 21:00 in Tokyo (UTC+9).
      await expect(page.locator('#formatted-date')).toContainText('21:00');
    });
  });

  test('?lang= overrides the browser language', async ({ page }) => {
    await page.goto('/locale?lang=es');
    await expect(page.locator('#greeting')).toHaveText('¡Hola!');
    await expect(page.locator('#server-language')).toHaveText('es');
  });
});

test.describe('Responsive layout', () => {
  test.describe('desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('full navigation is shown and cards sit side by side', async ({ page }) => {
      await page.goto('/responsive');

      expect(await pseudoContent(page, '#layout-name', '::after')).toBe('desktop');
      await expect(page.locator('#menu-toggle')).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Example shop' })).toBeVisible();
      const [a, b] = [await page.locator('#card-1').boundingBox(), await page.locator('#card-2').boundingBox()];
      expect(Math.round(a!.y)).toBe(Math.round(b!.y));
    });
  });

  test.describe('mobile', () => {
    test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

    test('navigation collapses into a menu button and cards stack', async ({ page }) => {
      await page.goto('/responsive');

      expect(await pseudoContent(page, '#layout-name', '::after')).toBe('mobile');
      await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Example shop' })).toBeHidden();
      const [a, b] = [await page.locator('#card-1').boundingBox(), await page.locator('#card-2').boundingBox()];
      expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
    });

    test('user opens the menu, picks an item and the menu closes', async ({ page }) => {
      await page.goto('/responsive');
      const toggle = page.getByRole('button', { name: 'Menu' });

      await toggle.tap();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.getByRole('link', { name: 'Pricing' }).tap();

      await expect(page.locator('#nav-result')).toHaveText('You clicked Pricing');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
  });
});

test.describe('Cookie consent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookie_consent');
  });

  const consentCookie = async (context: import('@playwright/test').BrowserContext) =>
    (await context.cookies()).find((c) => c.name === 'cookie_consent')?.value;

  test('first-time visitor sees the banner and no choice is stored', async ({ page, context }) => {
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#consent-status')).toHaveText('Analytics cookies: not decided yet');
    expect(await consentCookie(context)).toBeUndefined();
  });

  test('accepting all cookies stores the choice and hides the banner for good @smoke', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Accept all' }).click();

    await expect(page.locator('#consent-status')).toHaveText('Analytics cookies: allowed');
    await expect(page.locator('#cookie-banner')).toHaveCount(0);
    expect(await consentCookie(context)).toBe('all');

    await page.reload();
    await expect(page.locator('#cookie-banner')).toHaveCount(0);
  });

  test('choosing only necessary cookies blocks analytics', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Only necessary' }).click();

    await expect(page.locator('#consent-status')).toHaveText('Analytics cookies: blocked');
    expect(await consentCookie(context)).toBe('necessary');
  });

  test('user customises the choice and opts in to analytics', async ({ page, context }) => {
    const customize = page.getByRole('button', { name: 'Customize' });
    await customize.click();
    await expect(customize).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel('Necessary (always on)')).toBeDisabled();

    await page.getByRole('checkbox', { name: 'Analytics' }).check();
    await page.getByRole('button', { name: 'Save my choice' }).click();

    await expect(page.locator('#consent-status')).toHaveText('Analytics cookies: allowed');
    expect(await consentCookie(context)).toBe('all');
  });

  test('"Forget my choice" brings the banner back', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Accept all' }).click();
    await expect(page.locator('#cookie-banner')).toHaveCount(0);

    await page.getByRole('link', { name: 'Forget my choice' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await consentCookie(context)).toBeUndefined();
  });
});
