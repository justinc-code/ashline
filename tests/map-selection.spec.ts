import { test, expect } from '@playwright/test';

test('map click selects a clustered volcano and connects to its description', async ({ page }, testInfo) => {
  await page.goto('/');
  const map = page.getByRole('group', { name: 'Interactive global volcano map', exact: true });
  await map.scrollIntoViewIfNeeded();
  const marker = page.locator('circle[data-volcano-id]').filter({ has: page.locator('title', { hasText: /^Semeru, / }) });
  const title = await marker.locator('title').textContent();
  expect(title).toContain('Semeru');
  await marker.click({ force: true });
  await expect(page.locator('.dossier h2')).toHaveText('Semeru');
  await expect(page.getByRole('region', { name: 'Description of Semeru' })).toBeVisible();
  await expect(page.locator('.atlas-pick-list')).toContainText('nearby volcanoes');
  await page.getByRole('button', { name: 'Zoom to nearby' }).click();
  await expect(page.getByLabel('Global map zoom')).not.toHaveText('1.0×');
  const neighbor = page.locator('.atlas-pick-list button[aria-pressed=false]').first();
  const neighborName = await neighbor.locator('strong').textContent();
  await neighbor.click();
  await expect(page.locator('.dossier h2')).toHaveText(neighborName!);
  await expect(page.locator('#geology-heading')).toHaveText(`About ${neighborName}`);
  await page.getByRole('button', { name: 'Read full description' }).click();
  await expect(page.locator('#geology-heading')).toBeFocused();
  await expect(page.locator('#geology-heading')).toBeInViewport();
  await map.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/private/tmp/ashline-map-selection-${testInfo.project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('drag does not select; keyboard and filtered map selection work', async ({ page }) => {
  await page.goto('/');
  const semeruId = await page.locator('circle[data-volcano-id]').filter({ has: page.locator('title', { hasText: /^Semeru, / }) }).getAttribute('data-volcano-id');
  await page.getByRole('textbox', { name: 'Search map volcanoes' }).fill(semeruId!);
  await page.getByRole('button', { name: 'Fit matches' }).click();
  const map = page.getByRole('group', { name: 'Interactive global volcano map', exact: true });
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.dossier h2')).toHaveText('Merapi');
  await page.getByRole('button', { name: 'Fit matches' }).click();
  await map.focus();
  await map.press('Enter');
  await expect(page.locator('.dossier h2')).toHaveText('Semeru');
  await expect(page.locator('.atlas-pick-list')).toHaveCount(0);
});

test('terrain relief and contours remain inspectable', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Scenario simulator', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play eruption', exact: true })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('checkbox', { name: 'Ash plume', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: /Contour lines/ }).check();
  await page.getByRole('combobox', { name: 'Ground surface' }).selectOption('elevation');
  await expect(page.getByLabel('Terrain elevation colors')).toContainText('Elevation');
  await page.getByRole('button', { name: 'Top view', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom into 3D view', exact: true }).click();
  const canvas = page.locator('.eruption-stage canvas');
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * .55, y: box.height * .5 } });
  await expect(page.locator('.terrain-inspection')).toContainText('sampled slope');
  await page.getByRole('button', { name: 'Reset 3D camera' }).click();
  await page.locator('.eruption-stage').screenshot({ path: `/private/tmp/ashline-relief-${testInfo.project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('world landscape loads surrounding DEM and satellite imagery', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Scenario simulator', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play eruption', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(page.locator('.world-surface-controls')).toContainText('60 km surrounding DEM landscape', { timeout: 20000 });
  await expect(page.locator('.world-surface-controls')).toContainText('Satellite imagery · Esri', { timeout: 20000 });
  await page.getByRole('checkbox', { name: 'Ash plume', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Settled ash', exact: true }).uncheck();
  await page.locator('.eruption-stage').screenshot({ path: `/private/tmp/ashline-world-${testInfo.project.name}.png` });
  await page.getByRole('button', { name: 'Top view', exact: true }).click();
  await page.locator('.eruption-stage').screenshot({ path: `/private/tmp/ashline-world-top-${testInfo.project.name}.png` });
  await page.getByRole('combobox', { name: 'Ground surface' }).selectOption('elevation');
  await expect(page.getByLabel('Terrain elevation colors')).toBeVisible();
  expect(errors).toEqual([]);
});

test('world remains usable when imagery and surrounding terrain are unavailable', async ({ page }) => {
  await page.route('**/terrain/10/**/*.png', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.route('https://server.arcgisonline.com/**', route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Scenario simulator', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play eruption', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(page.locator('.world-surface-controls')).toContainText('Surrounding terrain unavailable');
  await expect(page.locator('.world-surface-controls')).toContainText('Satellite imagery unavailable');
  await expect(page.getByLabel('Terrain elevation colors')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play eruption', exact: true })).toBeEnabled();
});
