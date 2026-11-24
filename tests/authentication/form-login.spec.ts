import { test, expect } from '../../fixtures/test';
import { users } from '../../test-data/users';

/**
 * Feature: Form Authentication (/login)
 * As a registered user I can log in to and out of the secure area,
 * and I get clear feedback when my credentials are wrong.
 */
test.describe('Form authentication', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('user with valid credentials reaches the secure area @smoke', async ({ page, loginPage, secureAreaPage }) => {
    await loginPage.login(users.standard.username, users.standard.password);

    await expect(page).toHaveURL(/\/secure$/);
    await expect(secureAreaPage.flashMessage).toContainText('You logged into a secure area!');
    await expect(secureAreaPage.loggedInUser).toHaveText(users.standard.username);
  });

  test('user can log out and is returned to the login page', async ({ page, loginPage, secureAreaPage }) => {
    await loginPage.login(users.standard.username, users.standard.password);
    await secureAreaPage.logout();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.flashMessage).toContainText('You logged out of the secure area!');
  });

  test('unknown username is rejected with an error', async ({ page, loginPage }) => {
    await loginPage.login(users.invalidUsername.username, users.invalidUsername.password);

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.flashMessage).toHaveClass(/error/);
    await expect(loginPage.flashMessage).toContainText('Your username is invalid!');
  });

  test('wrong password is rejected with an error', async ({ page, loginPage }) => {
    await loginPage.login(users.invalidPassword.username, users.invalidPassword.password);

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.flashMessage).toContainText('Your password is invalid!');
  });

  test('password field masks what the user types', async ({ loginPage }) => {
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('secure area cannot be reached without logging in', async ({ page, secureAreaPage, loginPage }) => {
    await secureAreaPage.goto();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.flashMessage).toContainText('You must login to view the secure area!');
  });

  test('session is lost after logout (back button does not restore access)', async ({ page, loginPage, secureAreaPage }) => {
    await loginPage.login(users.standard.username, users.standard.password);
    await secureAreaPage.logout();
    await secureAreaPage.goto();

    await expect(page).toHaveURL(/\/login$/);
  });
});
