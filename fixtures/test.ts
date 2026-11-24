import { test as base } from '@playwright/test';
import {
  ChatPage,
  DataTablesPage,
  DynamicControlsPage,
  FileUploadPage,
  HomePage,
  JavaScriptAlertsPage,
  LoginPage,
  SecureAreaPage,
  SignupFormPage,
  TwoFactorPage,
} from '../pages';

type PageObjects = {
  homePage: HomePage;
  loginPage: LoginPage;
  secureAreaPage: SecureAreaPage;
  twoFactorPage: TwoFactorPage;
  signupFormPage: SignupFormPage;
  dynamicControlsPage: DynamicControlsPage;
  alertsPage: JavaScriptAlertsPage;
  uploadPage: FileUploadPage;
  tablesPage: DataTablesPage;
  chatPage: ChatPage;
};

/**
 * Custom `test` that injects ready-made page objects into each test,
 * so specs read as business steps instead of setup boilerplate.
 */
export const test = base.extend<PageObjects>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  secureAreaPage: async ({ page }, use) => use(new SecureAreaPage(page)),
  twoFactorPage: async ({ page }, use) => use(new TwoFactorPage(page)),
  signupFormPage: async ({ page }, use) => use(new SignupFormPage(page)),
  dynamicControlsPage: async ({ page }, use) => use(new DynamicControlsPage(page)),
  alertsPage: async ({ page }, use) => use(new JavaScriptAlertsPage(page)),
  uploadPage: async ({ page }, use) => use(new FileUploadPage(page)),
  tablesPage: async ({ page }, use) => use(new DataTablesPage(page)),
  chatPage: async ({ page }, use) => use(new ChatPage(page)),
});

export { expect } from '@playwright/test';
