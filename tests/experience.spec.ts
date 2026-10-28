import { test, expect } from '@playwright/test';
test('desktop: wake, orbit, inspect, disassemble, traverse, all portals, return', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.phase-core')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'docs/visual-review/v1.5/final/qa-01-desktop.png' });
  await page.locator('canvas').click({ position: { x: 1090, y: 350 } });
  await expect(page.locator('.part-inspector')).toBeVisible();
  await page.getByRole('button', { name: '关闭组件说明' }).click();
  const canvas = page.locator('canvas');
  await canvas.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('c');
  await expect(page.locator('.part-inspector')).toBeVisible();
  await page.getByRole('button', { name: '关闭组件说明' }).click();
  await canvas.focus();
  await page.keyboard.press('d');
  await expect(page.getByRole('button', { name: /REASSEMBLE/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'docs/visual-review/v1.5/final/qa-02-disassembled.png' });
  await page.getByRole('button', { name: /REASSEMBLE/ }).click();
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: /ENTER THE CORE/ }).click();
  await expect(page.locator('.phase-entering')).toBeVisible();
  await page.waitForTimeout(2300);
  await page.screenshot({ path: 'docs/visual-review/v1.5/final/qa-02-transit.png' });
  await expect(page.locator('.phase-lab')).toBeVisible({ timeout: 12000 });
  await page.screenshot({ path: 'docs/visual-review/v1.5/final/qa-02-lab.png' });
  for (const name of [
    '3D Experiments',
    'Generative Art',
    'Interactive Worlds',
    'Motion Studies',
    'Future Experiments',
  ]) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect(page.locator('.experiment-detail h2')).toHaveText(name);
  }
  await page.getByRole('button', { name: '关闭实验说明' }).click();
  await expect(page.locator('.experiment-detail')).toHaveCount(0);
  await page.waitForTimeout(1900);
  await expect(page.locator('.experiment-nav button[aria-pressed="true"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.phase-core')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: /DISASSEMBLE/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByRole('button', { name: '开启声音' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  console.log('Desktop rendering sample:', await canvas.evaluate((el) => ({ ...el.dataset })));
  await page.getByRole('button', { name: '开启声音' }).click();
  await expect(page.getByRole('button', { name: '关闭声音' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '关闭声音' }).click();
  expect(errors).toEqual([]);
});
test('320px, tablet and wide layouts remain reachable; context loss is handled', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.phase-core')).toBeVisible({ timeout: 30000 });
  for (const [width, height] of [
    [320, 740],
    [768, 1024],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await expect(page.getByRole('button', { name: /ENTER THE CORE/ })).toBeInViewport();
    await page.screenshot({ path: `docs/visual-review/v1.5/final/qa-03-${width}.png` });
  }
  await page
    .locator('canvas')
    .evaluate((el) =>
      (el as HTMLCanvasElement)
        .getContext('webgl2')
        ?.getExtension('WEBGL_lose_context')
        ?.loseContext(),
    );
  await expect(page.getByRole('alert')).toContainText('上下文已中断');
});
test('mobile: reduced motion, controls, settings and responsive lab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.phase-core')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'docs/visual-review/v1.5/final/qa-03-mobile.png' });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: '操作说明与设置' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: /减少动态/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /ENTER THE CORE/ }).click();
  await expect(page.locator('.phase-lab')).toBeVisible();
  await page.screenshot({ path: 'docs/visual-review/v1.5/final/qa-03-mobile-lab.png' });
  await page.getByRole('button', { name: /Generative Art/ }).click();
  await expect(page.locator('.experiment-detail h2')).toHaveText('Generative Art');
  await page.getByRole('button', { name: /返回核心/ }).click();
  await expect(page.locator('.phase-core')).toBeVisible();
});
test('asset failure displays usable fallback rather than fake success', async ({ page }) => {
  await page.route('**/models/the-core-v1.5.glb', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.fallback')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('alert')).toContainText('失败');
  await expect(page.locator('.fallback details')).toHaveCount(5);
});
test('no WebGL presents accessible fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return original.apply(this, [type, ...args] as never);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('.fallback')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('alert')).toContainText('WebGL');
  await page.screenshot({ path: 'docs/visual-review/v1.5/final/qa-03-fallback.png' });
});

