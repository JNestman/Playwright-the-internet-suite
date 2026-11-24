import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated accessibility scanning with axe-core.
 * The page documents its own known issues in a table; the test reads that
 * table and checks axe finds every one, then checks the fixed version is clean.
 */

test.describe('Accessibility scanning (axe-core)', () => {
  test('axe detects every documented issue on the broken page', async ({ page }) => {
    await page.goto('/accessibility_issues');
    const documentedRules = await page.locator('#known-issues tbody tr').evaluateAll((rows) =>
      rows.map((r) => r.getAttribute('data-rule')!),
    );
    expect(documentedRules.length).toBeGreaterThan(0);

    const results = await new AxeBuilder({ page }).include('#widgets').analyze();
    // axe files checks it can't fully decide (often colour contrast) under "incomplete" for a human
    // to review, so a documented issue counts as found if it is in either list.
    const found = [...results.violations, ...results.incomplete].map((v) => v.id);

    for (const rule of documentedRules) {
      expect.soft(found, `axe should report "${rule}"`).toContain(rule);
    }
  });

  test('fixed version of the page has none of the documented issues', async ({ page }) => {
    await page.goto('/accessibility_issues');
    const documentedRules = await page.locator('#known-issues tbody tr').evaluateAll((rows) =>
      rows.map((r) => r.getAttribute('data-rule')!),
    );

    await page.goto('/accessibility_issues?fixed=true');
    const results = await new AxeBuilder({ page }).include('#widgets').withRules(documentedRules).analyze();

    expect(
      results.violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target.join(' ')) })),
    ).toEqual([]);
  });

  test('login form meets WCAG 2.1 A/AA for form labelling', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .include('#login')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const labelIssues = results.violations.filter((v) => ['label', 'label-title-only'].includes(v.id));
    expect(labelIssues).toEqual([]);
  });
});
