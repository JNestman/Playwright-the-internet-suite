/**
 * Test accounts published by the demo site itself on its home page.
 * They are public demo values, not real secrets. A real project would load
 * credentials from environment variables or a secrets manager instead.
 */
export const users = {
  standard: { username: 'tomsmith', password: 'SuperSecretPassword!' },
  invalidUsername: { username: 'not-a-real-user', password: 'SuperSecretPassword!' },
  invalidPassword: { username: 'tomsmith', password: 'wrong-password' },
} as const;

export const httpAuth = {
  valid: { username: 'admin', password: 'admin' },
  invalid: { username: 'admin', password: 'not-the-password' },
} as const;
