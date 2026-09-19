import { test, expect } from '@playwright/test';

test('search results support keyboard selection and directly locate a volcano', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'Search map volcanoes' });
  await search.fill('Semeru');
  await expect(page.getByRole('listbox', { name: 'Matching volcanoes' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Semeru Indonesia · Stratovolcano', exact: true })).toBeVisible();
  await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', /result-0$/);
  await search.press('Enter');
  await expect(page.locator('.dossier h2')).toHaveText('Semeru');
  await expect(page.getByLabel('Global map zoom')).toHaveText('6.0×');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('group', { name: 'Interactive global volcano map', exact: true })).toBeFocused();
  await expect(page.locator('.atlas-description')).not.toContainText('Outside');
  await expect(page.getByRole('textbox', { name: 'Search volcanoes', exact: true })).toHaveValue('Semeru');
  await search.focus();
  await search.press('Escape');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await search.fill('Fuji');
  await page.getByRole('option', { name: 'Fujisan Japan · Stratovolcano', exact: true }).click();
  await expect(page.locator('.dossier h2')).toHaveText('Fujisan');
  await expect(page.getByLabel('Global map zoom')).toHaveText('6.0×');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
});

test('country filtering, regional views, and empty-state recovery stay synchronized', async ({ page }) => {
  await page.goto('/');
  const country = page.getByRole('combobox', { name: 'Map country filter' });
  await country.selectOption('Japan');
  await expect(page.getByRole('combobox', { name: 'Filter by country', exact: true })).toHaveValue('Japan');
  await expect(page.getByLabel('Global map zoom')).not.toHaveText('1.0×');
  await expect(page.getByRole('button', { name: 'Focus selected', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Search map volcanoes' }).fill('no-volcano-here');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
  await expect(country).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Search map volcanoes' })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Focus selected', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Global map zoom')).toHaveText('1.0×');
  const region = page.getByRole('combobox', { name: 'Jump to region' });
  await region.selectOption('South America');
  await expect(region).toHaveValue('South America');
  await expect(page.getByLabel('Global map zoom')).toHaveText('3.4×');
  const map = page.getByRole('group', { name: 'Interactive global volcano map', exact: true });
  await map.press('ArrowLeft');
  await expect(region).toHaveValue('custom');
  await page.getByRole('button', { name: 'Reset map zoom', exact: true }).click();
  await expect(region).toHaveValue('world');
  await page.getByRole('button', { name: 'Map guide', exact: true }).click();
  await expect(page.getByText('Explore the atlas', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Browse catalog' }).click();
  await expect(page.locator('#volcano-catalog')).toBeFocused();
  await expect(page.locator('.catalog-heading')).toBeInViewport();
});

test('map controls remain usable at each viewport', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const panel = page.locator('.map-panel');
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/private/tmp/ashline-modern-${testInfo.project.name}.png` });
  await panel.screenshot({ path: `/private/tmp/ashline-modern-panel-${testInfo.project.name}.png` });
  await page.getByRole('button', { name: 'Focus selected', exact: true }).click();
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('button', { name: 'Return to world view' })).toBeVisible();
    await page.getByRole('button', { name: 'Return to world view' }).click();
    await expect(page.getByLabel('Global map zoom')).toHaveText('1.0×');
  }
  await page.getByRole('button', { name: 'Expand map', exact: true }).click();
  await expect(page.locator('.atlas-layout')).toHaveClass(/atlas-expanded/);
  await page.getByRole('button', { name: 'Collapse map', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
