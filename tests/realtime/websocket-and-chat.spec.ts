import { test, expect } from '../../fixtures/test';
import { ChatPage } from '../../pages';

/**
 * Real-time features over WebSockets: an echo service, and a multi-user chat
 * tested with two independent browser contexts (two "users" at once).
 */

test.describe('WebSocket echo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/websocket');
  });

  test('message sent over the socket is echoed back by the server', async ({ page }) => {
    // Observe the raw socket traffic as well as what the UI shows.
    const socketPromise = page.waitForEvent('websocket');
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    const socket = await socketPromise;
    await expect(page.locator('#connection')).toHaveText('Connected');

    const echoed = socket.waitForEvent('framereceived', (f) => f.payload === 'Echo: hello server');
    await page.getByRole('textbox', { name: 'Message' }).fill('hello server');
    await page.getByRole('button', { name: 'Send' }).click();
    await echoed;

    await expect(page.locator('#messages li.sent')).toHaveText(['hello server']);
    // The server greets each new connection before echoing anything.
    await expect(page.locator('#messages li.received')).toHaveText([
      /^Connected\./,
      'Echo: hello server',
    ]);
    expect(socket.url()).toMatch(/\/websocket\/echo$/);
  });

  test('controls are only enabled while connected', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeDisabled();

    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeDisabled();
  });

  test('user disconnects cleanly with close code 1000', async ({ page }) => {
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await expect(page.locator('#connection')).toHaveText('Connected');

    await page.getByRole('button', { name: 'Disconnect' }).click();

    await expect(page.locator('#connection')).toHaveText('Disconnected (code 1000: Closed by the page)');
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeDisabled();
  });
});

test.describe('Multi-user chat', () => {
  test('two users in the same room see each other join and chat @smoke', async ({ browser }) => {
    // A unique room keeps parallel runs (and other people using the demo site) apart.
    const room = `pw-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alice = new ChatPage(await aliceContext.newPage());
    const bob = new ChatPage(await bobContext.newPage());

    try {
      await alice.openRoom(room);
      await alice.join('Alice');
      await bob.openRoom(room);
      await bob.join('Bob');

      await expect(alice.notices.filter({ hasText: 'Bob' })).toHaveCount(1);

      await alice.send('Hi Bob, did the build pass?');
      await bob.send('Yes - all green!');

      for (const user of [alice, bob]) {
        await expect(user.messages).toHaveText(['Alice: Hi Bob, did the build pass?', 'Bob: Yes - all green!']);
      }
    } finally {
      await aliceContext.close();
      await bobContext.close();
    }
  });

  test('other users are told when someone leaves', async ({ browser }) => {
    const room = `pw-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alice = new ChatPage(await aliceContext.newPage());
    const bob = new ChatPage(await bobContext.newPage());

    try {
      await alice.openRoom(room);
      await alice.join('Alice');
      await bob.openRoom(room);
      await bob.join('Bob');
      await expect(alice.notices.filter({ hasText: 'Bob' })).toHaveCount(1);

      await bobContext.close();

      await expect(alice.notices.filter({ hasText: /Bob.*left/ })).toHaveCount(1);
    } finally {
      await aliceContext.close();
    }
  });

  test('messages are only delivered within the same room', async ({ browser }) => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const userA = new ChatPage(await ctxA.newPage());
    const userB = new ChatPage(await ctxB.newPage());

    try {
      await userA.openRoom(`pw-a-${suffix}`);
      await userA.join('RoomA');
      await userB.openRoom(`pw-b-${suffix}`);
      await userB.join('RoomB');

      await userA.send('private to room A');
      await expect(userA.messages).toHaveText(['RoomA: private to room A']);
      await expect(userB.messages).toHaveCount(0);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('message input is disabled until the user joins', async ({ chatPage }) => {
    await chatPage.openRoom(`pw-${Date.now()}`);
    await expect(chatPage.messageInput).toBeDisabled();
    await expect(chatPage.joinButton).toBeEnabled();
  });
});
