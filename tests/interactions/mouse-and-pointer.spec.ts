import { test, expect } from '@playwright/test';

/**
 * Mouse-driven interactions: hover, right-click, HTML5 drag and drop,
 * low-level pointer gestures, canvas and SVG.
 */

test.describe('Hovers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hovers');
  });

  for (const user of [1, 2, 3]) {
    test(`hovering avatar ${user} reveals the user's name and profile link`, async ({ page }) => {
      const figure = page.locator('.figure').nth(user - 1);
      const caption = figure.locator('.figcaption');

      await expect(caption).toBeHidden();
      await figure.hover();

      await expect(caption).toBeVisible();
      await expect(caption.getByRole('heading')).toHaveText(`name: user${user}`);
      await expect(caption.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', `/users/${user}`);
    });
  }

  test('caption hides again when the mouse moves away', async ({ page }) => {
    const figure = page.locator('.figure').first();
    await figure.hover();
    await expect(figure.locator('.figcaption')).toBeVisible();

    await page.locator('h3').hover();
    await expect(figure.locator('.figcaption')).toBeHidden();
  });
});

test.describe('Context menu', () => {
  test('right-clicking the hot spot raises the custom alert', async ({ page }) => {
    await page.goto('/context_menu');
    // The alert blocks the click from completing, so register the handler before clicking.
    const dialogPromise = new Promise<{ type: string; message: string }>((resolve) => {
      page.once('dialog', async (dialog) => {
        resolve({ type: dialog.type(), message: dialog.message() });
        await dialog.accept();
      });
    });

    await page.locator('#hot-spot').click({ button: 'right' });

    expect(await dialogPromise).toEqual({ type: 'alert', message: 'You selected a context menu' });
  });

  test('a normal left click does not raise the alert', async ({ page }) => {
    await page.goto('/context_menu');
    let dialogShown = false;
    page.on('dialog', async (d) => {
      dialogShown = true;
      await d.dismiss();
    });

    await page.locator('#hot-spot').click();

    expect(dialogShown).toBe(false);
  });
});

test.describe('Drag and drop (HTML5)', () => {
  test('dragging A onto B swaps the two columns @smoke', async ({ page, browserName }) => {
    test.fixme(
      browserName === 'webkit',
      'WebKit returns empty text/html from dataTransfer.getData() during synthetic drags, so the dropped column loses its content',
    );
    await page.goto('/drag_and_drop');
    await expect(page.locator('#columns header')).toHaveText(['A', 'B']);

    await page.locator('#column-a').dragTo(page.locator('#column-b'));

    await expect(page.locator('#columns header')).toHaveText(['B', 'A']);
  });

  test('dragging back restores the original order', async ({ page }) => {
    await page.goto('/drag_and_drop');

    await page.locator('#column-a').dragTo(page.locator('#column-b'));
    await page.locator('#column-a').dragTo(page.locator('#column-b'));

    await expect(page.locator('#columns header')).toHaveText(['A', 'B']);
  });
});

test.describe('Pointer events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pointer_events');
  });

  test('user reorders the sortable list by dragging an item to the bottom', async ({ page }) => {
    const first = page.locator('#sortable li', { hasText: 'First' });
    const last = page.locator('#sortable li', { hasText: 'Fourth' });
    const from = (await first.boundingBox())!;
    const to = (await last.boundingBox())!;

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height + 5, { steps: 10 });
    await page.mouse.up();

    await expect(page.locator('#order')).toHaveText('Order: Second, Third, Fourth, First');
  });

  const swipes = [
    { direction: 'right', dx: 150 },
    { direction: 'left', dx: -150 },
  ];
  for (const { direction, dx } of swipes) {
    test(`swiping ${direction} is recognised`, async ({ page }) => {
      // Raw mouse coordinates are viewport-relative, so bring the target on screen first.
      await page.locator('#swipe-area').scrollIntoViewIfNeeded();
      const area = (await page.locator('#swipe-area').boundingBox())!;
      const startX = area.x + area.width / 2;
      const y = area.y + area.height / 2;

      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(startX + dx, y, { steps: 5 });
      await page.mouse.up();

      await expect(page.locator('#swipe-result')).toHaveText(`Swiped ${direction} (mouse)`);
    });
  }

  test('a short drag is not treated as a swipe', async ({ page }) => {
    await page.locator('#swipe-area').scrollIntoViewIfNeeded();
    const area = (await page.locator('#swipe-area').boundingBox())!;
    await page.mouse.move(area.x + area.width / 2, area.y + 10);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width / 2 + 20, area.y + 10);
    await page.mouse.up();

    await expect(page.locator('#swipe-result')).toHaveText('Too short to be a swipe');
  });

  test('holding the button for 800 ms counts as a long press', async ({ page }) => {
    await page.locator('#long-press').hover();
    await page.mouse.down();
    await expect(page.locator('#press-result')).toHaveText('Long press');
    await page.mouse.up();

    await expect(page.locator('#press-result')).toHaveText('Long press');
  });

  test('a quick click counts as a short press', async ({ page }) => {
    await page.locator('#long-press').click();
    await expect(page.locator('#press-result')).toHaveText('Short press (hold for 800 ms)');
  });
});

test.describe('Canvas', () => {
  test('clicking draws a red dot at the clicked coordinates', async ({ page }) => {
    await page.goto('/canvas');
    const canvas = page.locator('#canvas');

    await canvas.click({ position: { x: 120, y: 80 } });

    // The canvas has a 1px border, so the drawing position may be off by one from the click.
    const log = page.locator('#canvas-log');
    await expect(log).toHaveText(/^Clicked at 1(19|20|21), (79|80|81)$/);
    const [x, y] = (await log.innerText()).replace('Clicked at ', '').split(', ').map(Number);

    // Canvas content isn't in the DOM, so read the pixel straight from the bitmap.
    const [r, g, b] = await canvas.evaluate(
      (el: HTMLCanvasElement, [px, py]) => Array.from(el.getContext('2d')!.getImageData(px, py, 1, 1).data),
      [x, y],
    );
    expect({ r, g, b }).toEqual({ r: 0xe2, g: 0x23, b: 0x1a });
  });

  test('text typed into the canvas is submitted with Enter', async ({ page }) => {
    await page.goto('/canvas');
    await page.locator('#canvas').click({ position: { x: 10, y: 10 } });

    await page.keyboard.type('Hello canvas');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');

    await expect(page.locator('#canvas-log')).toHaveText('Submitted: Hello canva');
  });
});

test.describe('SVG chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/svg');
  });

  test('chart is exposed to assistive tech with a title', async ({ page }) => {
    await expect(page.getByRole('img', { name: 'Fruit sales' })).toBeVisible();
  });

  test('clicking a bar selects it and shows its value', async ({ page }) => {
    const bananas = page.locator('#bar-bananas');
    await bananas.click();

    await expect(page.locator('#result')).toHaveText('Selected Bananas: 180');
    await expect(bananas).toHaveAttribute('fill', '#f55524');
    await expect(page.locator('#bar-apples')).toHaveAttribute('fill', '#334bc3');
  });

  test('bar heights match their data values', async ({ page }) => {
    const bars = page.locator('#chart rect.bar');
    await expect(bars).toHaveCount(3);
    for (const bar of await bars.all()) {
      expect(await bar.getAttribute('height')).toBe(await bar.getAttribute('data-value'));
    }
  });

  test('circle toggles between green and red', async ({ page }) => {
    const circle = page.locator('#toggle-circle');

    await circle.click();
    await expect(page.locator('#result')).toHaveText('Circle is red');
    await expect(page.locator('#circle-label')).toHaveText('Clicked');

    await circle.click();
    await expect(page.locator('#result')).toHaveText('Circle is green');
    await expect(page.locator('#circle-label')).toHaveText('Click me');
  });
});
