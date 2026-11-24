import { test, expect } from '../../fixtures/test';
import type { SignupDetails } from '../../pages';

/**
 * Feature: Account sign-up form (/form_validation)
 * The browser enforces field rules first; the server then enforces business
 * rules (e.g. usernames that are already taken).
 */
const uniqueUsername = () => `qa${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

const validDetails = (): SignupDetails => ({
  username: uniqueUsername(),
  email: 'new.customer@example.com',
  age: '30',
  website: 'https://example.com',
  password: 'CorrectHorse1',
  acceptTerms: true,
});

test.describe('Sign-up form validation', () => {
  test.beforeEach(async ({ signupFormPage }) => {
    await signupFormPage.goto();
  });

  test('new customer can create an account with valid details @smoke', async ({ signupFormPage }) => {
    await signupFormPage.fill(validDetails());
    await signupFormPage.submit();

    await expect(signupFormPage.result).not.toHaveText(/Checking|Please fix/);
    await expect(signupFormPage.result).not.toBeEmpty();
    await expect(signupFormPage.visibleFieldErrors).toHaveCount(0);
  });

  test('server rejects a username that is already taken', async ({ signupFormPage }) => {
    await signupFormPage.fill({ ...validDetails(), username: 'tomsmith' });
    await signupFormPage.submit();

    await expect(signupFormPage.result).toHaveText('Please fix the errors below');
    await expect(signupFormPage.fieldError('username')).not.toBeEmpty();
    await expect(signupFormPage.username).toHaveAttribute('aria-invalid', 'true');
  });

  test('browser blocks submission when required fields are empty', async ({ page, signupFormPage }) => {
    let serverCalled = false;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/form_validation')) serverCalled = true;
    });

    await signupFormPage.submit();

    expect(await signupFormPage.isValid(signupFormPage.username)).toBe(false);
    expect(await signupFormPage.validationMessage(signupFormPage.username)).not.toBe('');
    await expect(signupFormPage.result).toBeEmpty();
    expect(serverCalled).toBe(false);
  });

  const invalidFieldCases = [
    { field: 'username', value: 'AB', reason: 'too short and uppercase' },
    { field: 'username', value: 'has spaces', reason: 'contains spaces' },
    { field: 'email', value: 'not-an-email', reason: 'is not an e-mail address' },
    { field: 'age', value: '17', reason: 'is under 18' },
    { field: 'age', value: '121', reason: 'is over 120' },
    { field: 'website', value: 'example dot com', reason: 'is not a URL' },
    { field: 'password', value: 'short', reason: 'is under 8 characters' },
  ] as const;

  for (const { field, value, reason } of invalidFieldCases) {
    test(`${field} is invalid when it ${reason}`, async ({ signupFormPage }) => {
      const input = signupFormPage[field];
      await input.fill(value);

      expect(await signupFormPage.isValid(input)).toBe(false);
    });
  }

  test('terms must be accepted before submitting', async ({ signupFormPage }) => {
    await signupFormPage.fill({ ...validDetails(), acceptTerms: false });
    await signupFormPage.submit();

    expect(await signupFormPage.isValid(signupFormPage.terms)).toBe(false);
    await expect(signupFormPage.result).toBeEmpty();
  });

  test('optional website field may be left blank', async ({ signupFormPage }) => {
    expect(await signupFormPage.isValid(signupFormPage.website)).toBe(true);
  });
});
