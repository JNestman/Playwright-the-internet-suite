import { test, expect } from '../../fixtures/test';
import { users } from '../../test-data/users';

/**
 * Feature: Two-Factor Login (/two_factor)
 * A user must pass a password step and then a one-time code step.
 */
test.describe('Two-factor login', () => {
  test.beforeEach(async ({ twoFactorPage }) => {
    await twoFactorPage.goto();
  });

  test('user completes both steps and is logged in @smoke', async ({ page, twoFactorPage }) => {
    await twoFactorPage.submitCredentials(users.standard.username, users.standard.password);

    await expect(twoFactorPage.displayedCode).toHaveText(/^\d{6}$/);
    const code = await twoFactorPage.readOneTimeCode();
    await twoFactorPage.submitCode(code);

    await expect(page).toHaveURL(/\/secure|\/two_factor\/secure/);
    await expect(page.locator('#flash')).toHaveClass(/success/);
  });

  test('wrong password does not advance to the code step', async ({ twoFactorPage }) => {
    await twoFactorPage.submitCredentials(users.invalidPassword.username, users.invalidPassword.password);

    await expect(twoFactorPage.codeInput).toBeHidden();
    await expect(twoFactorPage.flashMessage).toHaveClass(/error/);
  });

  test('wrong one-time code is rejected', async ({ page, twoFactorPage }) => {
    await twoFactorPage.submitCredentials(users.standard.username, users.standard.password);
    const realCode = await twoFactorPage.readOneTimeCode();
    const wrongCode = realCode === '000000' ? '111111' : '000000';

    await twoFactorPage.submitCode(wrongCode);

    await expect(page).not.toHaveURL(/secure/);
    await expect(twoFactorPage.flashMessage).toHaveClass(/error/);
  });

  test('code field is masked and limited to six digits', async ({ twoFactorPage }) => {
    await twoFactorPage.submitCredentials(users.standard.username, users.standard.password);

    await expect(twoFactorPage.codeInput).toHaveAttribute('type', 'password');
    await expect(twoFactorPage.codeInput).toHaveAttribute('maxlength', '6');
    await expect(twoFactorPage.codeInput).toHaveAttribute('autocomplete', 'one-time-code');
  });
});
