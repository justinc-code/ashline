import { test, expect } from "@playwright/test";
test("atlas, scenario, response, persistence, and community flow", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A world of volcanoes." }),
  ).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/ashline-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await expect(page.locator("body")).not.toHaveJSProperty("scrollWidth", 0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("textbox", { name: "Search volcanoes" }).fill("Merapi");
  await expect(
    page.getByRole("button", { name: "Simulate Merapi", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate Merapi", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Explore what could happen." }),
  ).toBeVisible();
  await page.getByRole("slider", { name: /Wind toward/ }).fill("270");
  await page.evaluate(() => window.scrollTo(0, 0));
  if (testInfo.project.name === "desktop")
    expect(
      await page
        .locator(".sidebar")
        .evaluate((el) => el.getBoundingClientRect().top),
    ).toBe(0);
  await page.screenshot({
    path: `/private/tmp/ashline-simulator-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Prepare response" }).click();
  await page
    .getByPlaceholder(
      "Record decisions, contacts, or questions for your exercise…",
    )
    .fill("Exercise Alpha");
  await page
    .getByRole("button", { name: "Save scenario", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/ashline-.*json/);
  await page.getByRole("button", { name: /Saved scenarios/ }).click();
  await expect(
    page.getByRole("button", { name: "Open", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Saved scenarios/ }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByRole("button", { name: "Prepare response" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("Exercise Alpha");
  await page.getByRole("button", { name: "Community", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your readiness checklist" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("bad import reports actionable error", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Saved scenarios/ }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(page.getByRole("status")).toContainText("invalid");
});
test("sourced geology, full catalog pagination, and expanded search", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "About Merapi", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".geology")).toContainText("Smithsonian GVP");
  await expect(page.locator(".geology>p").last()).not.toBeEmpty();
  await expect(
    page.getByRole("link", { name: "Read the source record" }),
  ).toHaveAttribute("href", /vn=263250/);
  expect(
    await page
      .locator(".brand img")
      .evaluate((el) => (el as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".catalog-pagination")).toContainText("61–120");
  await page
    .getByRole("textbox", { name: "Search volcanoes" })
    .fill("  mérapi indonesia ");
  await expect(
    page.getByRole("button", { name: "Simulate Merapi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous page", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".catalog-pagination")).toContainText("1–");
  await page.getByRole("textbox", { name: "Search volcanoes" }).fill("");
  await page.screenshot({
    path: `/private/tmp/ashline-information-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("geographic runs preserve settings, location, and mitigation choices", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scenario simulator", exact: true })
    .click();
  await page.getByLabel("Latitude", { exact: true }).fill("-7.54");
  await page.getByLabel("Longitude", { exact: true }).fill("110.446");
  await expect(page.locator(".location-result")).toContainText(
    "from the volcano",
  );
  await page
    .getByRole("checkbox", { name: /Prepare for ash exposure/ })
    .check();
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(page.locator(".run-table tbody tr")).toHaveCount(1);
  const original = await page
    .locator(".run-table tbody tr")
    .first()
    .textContent();
  await page
    .getByRole("slider", { name: "Wind speed", exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(page.locator(".run-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".run-table tbody tr").first()).toHaveText(
    original!,
  );
  await expect(page.locator(".run-table tbody tr").last()).toContainText(
    "100 km/h",
  );
  await expect(page.locator(".run-table tbody tr").last()).toContainText(
    "Prepare for ash exposure",
  );
  await page.getByLabel("Latitude", { exact: true }).fill("91");
  await expect(
    page.getByRole("button", { name: "Run scenario", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Enter both coordinates");
  await page.getByLabel("Latitude", { exact: true }).fill("-7.54");
  await page.locator(".scenario-lab").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/private/tmp/ashline-runs-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export runs", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("ashline-runs-263250.json");
  await page
    .getByRole("button", { name: "Prepare response", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit scenario", exact: true })
    .click();
  await expect(page.locator(".run-table tbody tr")).toHaveCount(2);
});

test("interactive 3D eruption playback, camera, layers, and scenario inputs", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scenario simulator", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Eruption in 3D", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  const canvas = page.locator(".eruption-stage canvas");
  await page
    .getByRole("button", { name: "Play eruption", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("slider", { name: "Eruption timeline" })
          .inputValue(),
      ),
    )
    .toBeGreaterThan(25);
  await page
    .getByRole("button", { name: "Pause eruption", exact: true })
    .click();
  await page.getByRole("slider", { name: "Eruption timeline" }).fill("60");
  await expect(page.locator(".eruption-timeline output")).toHaveText(
    "10.8 / 18 h",
  );
  await page
    .getByRole("button", { name: "Rotate camera right", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zoom into 3D view", exact: true })
    .click();
  await canvas.focus();
  await canvas.press("ArrowLeft");
  await canvas.press("Home");
  await page
    .getByRole("checkbox", { name: "Hazard outlines", exact: true })
    .check();
  await expect(page.locator(".eruption-layers")).toContainText("Ochre: ash");
  await page
    .getByRole("slider", { name: "3D wind speed", exact: true })
    .fill("60");
  await expect(
    page.getByRole("slider", { name: "Wind speed", exact: true }),
  ).toHaveValue("60");
  await page.getByRole("slider", { name: /Wind toward/ }).fill("270");
  await expect(page.locator(".scene-status")).toContainText(
    "wind 60 km/h toward 270°",
  );
  await page.getByRole("slider", { name: "Eruption timeline" }).fill("100");
  await page
    .getByRole("button", { name: "Replay eruption", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("slider", { name: "Eruption timeline" })
          .inputValue(),
      ),
    )
    .toBeGreaterThan(1);
  expect(
    Number(
      await page
        .getByRole("slider", { name: "Eruption timeline" })
        .inputValue(),
    ),
  ).toBeLessThan(20);
  await page
    .getByRole("button", { name: "Pause eruption", exact: true })
    .click();
  await page.getByRole("slider", { name: "Eruption timeline" }).fill("45");
  await page
    .getByRole("checkbox", { name: "Hazard outlines", exact: true })
    .uncheck();
  await page.locator(".eruption-view").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/private/tmp/ashline-3d-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".eruption-view")
    .screenshot({
      path: `/private/tmp/ashline-3d-panel-${testInfo.project.name}.png`,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Eruption timeline" }),
  ).toHaveValue("0");
  await expect(page.locator(".scene-status")).toContainText("Before eruption");
});

test("3D context loss recovers without resetting scenario settings", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scenario simulator", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await page
    .getByRole("slider", { name: "Wind speed", exact: true })
    .fill("80");
  await page
    .locator(".eruption-stage canvas")
    .dispatchEvent("webglcontextlost");
  await expect(
    page.getByRole("heading", { name: "3D view unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reload 3D view", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await expect(
    page.getByRole("slider", { name: "Wind speed", exact: true }),
  ).toHaveValue("80");
});

test("geographic DEM loads offline with source, true scale, and elevation inspection", async ({
  page,
}, testInfo) => {
  await page.route(
    "https://elevation-tiles-prod.s3.amazonaws.com/**",
    (route) => route.abort(),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scenario simulator", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await expect(page.locator(".terrain-summary")).toContainText("20 × 20 km");
  await expect(page.locator(".terrain-summary")).toContainText(
    "mesh spacing 78 m",
  );
  await expect(
    page.getByRole("combobox", { name: "Vertical scale" }),
  ).toHaveValue("1");
  await expect(page.locator(".terrain-inspection")).toContainText(
    "-7.54000°, 110.44600°",
  );
  await expect(
    page.getByRole("checkbox", { name: "Hot flows unavailable on DEM" }),
  ).toBeDisabled();
  await page
    .getByText("Elevation data sources and limits", { exact: true })
    .click();
  await expect(
    page.locator(".terrain-provenance:not(.ash-assumptions)"),
  ).toContainText("srtm/S08E110.tif");
  await page
    .getByRole("combobox", { name: "Vertical scale" })
    .selectOption("2");
  await expect(page.locator(".eruption-limits")).toContainText(
    "vertical exaggeration is 2×",
  );
  const canvas = page.locator(".eruption-stage canvas");
  const box = await canvas.boundingBox();
  await canvas.click({
    position: { x: box!.width * 0.55, y: box!.height * 0.65 },
  });
  await expect(page.locator(".terrain-inspection")).toContainText(
    "sampled slope",
  );
  await page
    .getByRole("combobox", { name: "Vertical scale" })
    .selectOption("1");
  await page.getByRole("slider", { name: "Eruption timeline" }).fill("0");
  await page.locator(".eruption-view").scrollIntoViewIfNeeded();
  await page
    .locator(".eruption-view")
    .screenshot({
      path: `/private/tmp/ashline-terrain-${testInfo.project.name}.png`,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("missing DEM stays explicit and allows retry or an opted-in procedural preview", async ({
  page,
}) => {
  await page.route("**/terrain/12/**/*.png", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scenario simulator", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Geographic terrain unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Use procedural preview" }).click();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".terrain-controls")).toContainText(
    "Procedural preview",
  );
  await page.unroute("**/terrain/12/**/*.png");
  await page.getByRole("button", { name: "Load geographic terrain" }).click();
  await expect(page.locator(".terrain-summary")).toContainText("DEM at vent");
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeEnabled();
});

test("ash settles on the DEM, persists, and scrubs reproducibly", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scenario simulator", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play eruption", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await page
    .getByRole("slider", { name: "3D wind speed", exact: true })
    .fill("0");
  await page
    .getByRole("slider", { name: "Ash release height", exact: true })
    .fill("0.5");
  await page
    .getByRole("combobox", {
      name: "Post-eruption settling duration",
      exact: true,
    })
    .selectOption("24");
  await page
    .getByRole("slider", { name: "Eruption timeline", exact: true })
    .fill("100");
  await expect
    .poll(async () =>
      Number(await page.getByTestId("ash-deposited").textContent()),
    )
    .toBe(1000);
  await expect(page.getByTestId("ash-airborne")).toHaveText("0");
  await expect(page.getByTestId("ash-outside")).toHaveText("0");
  await page
    .getByRole("slider", { name: "Eruption timeline", exact: true })
    .fill("0");
  await expect(page.getByTestId("ash-deposited")).toHaveText("0");
  await page
    .getByRole("slider", { name: "Eruption timeline", exact: true })
    .fill("100");
  await expect(page.getByTestId("ash-deposited")).toHaveText("1000");
  await page
    .getByRole("slider", { name: "3D wind speed", exact: true })
    .fill("25");
  await page
    .getByRole("slider", { name: "Ash release height", exact: true })
    .fill("1.5");
  await page
    .getByRole("combobox", {
      name: "Post-eruption settling duration",
      exact: true,
    })
    .selectOption("6");
  await page
    .getByRole("slider", { name: "Eruption timeline", exact: true })
    .fill("75");
  await expect(page.locator(".scene-status")).toContainText(
    "Post-eruption settling",
  );
  await expect
    .poll(async () =>
      Number(await page.getByTestId("ash-outside").textContent()),
    )
    .toBeGreaterThan(0);
  await page.locator(".eruption-view").scrollIntoViewIfNeeded();
  await page
    .locator(".eruption-view")
    .screenshot({
      path: `/private/tmp/ashline-settling-${testInfo.project.name}.png`,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("aftermath map layers, lava paths, coordinate inspection, and navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Response plan", exact: true })
    .click();
  const panel = page.locator(".response-map");
  const map = panel.getByRole("group", {
    name: "Interactive hazard map for Merapi",
    exact: true,
  });
  await expect(panel.locator("[data-layer]")).toHaveCount(5);
  await panel
    .getByRole("checkbox", { name: "Toxic gases", exact: true })
    .uncheck();
  await expect(panel.locator('[data-layer="gas"]')).toHaveCount(0);
  await panel
    .getByRole("checkbox", { name: "Toxic gases", exact: true })
    .check();
  await panel.getByLabel("Gas screening radius").selectOption("10");
  await panel
    .getByRole("button", { name: "Inspect main path end", exact: true })
    .click();
  await expect(panel.locator(".map-inspection")).toContainText("bearing 180°");
  await expect(panel.locator(".map-inspection")).toContainText(
    "Lava exposure not assessed",
  );
  await expect(panel.locator("[data-lava-path]")).toHaveCount(3);
  const originalPath = await panel
    .locator('[data-lava-path="Main path"]')
    .getAttribute("d");
  await panel.getByLabel("Assumed lava heading").selectOption("90");
  await panel.getByLabel("Assumed lava reach").selectOption("10");
  await expect(
    panel.locator('[data-lava-path="Main path"]'),
  ).not.toHaveAttribute("d", originalPath!);
  await panel
    .getByRole("checkbox", { name: "Lava flow paths", exact: true })
    .uncheck();
  await expect(panel.locator("[data-lava-path]")).toHaveCount(0);
  await panel
    .getByRole("checkbox", { name: "Lava flow paths", exact: true })
    .check();
  await panel
    .getByRole("button", { name: "Zoom into hazard map", exact: true })
    .click();
  await expect(panel.getByLabel("Hazard map zoom")).toHaveText("1.5×");
  await map.press("Home");
  await expect(panel.getByLabel("Hazard map zoom")).toHaveText("1.0×");
  await map.press("ArrowLeft");
  await map.press("Enter");
  await expect(panel.locator(".map-inspection")).toContainText("bearing 270°");
  await panel
    .getByRole("button", { name: "Reset hazard map", exact: true })
    .click();
  const bounds = await map.boundingBox();
  await map.click({
    position: { x: bounds!.width / 2, y: bounds!.height / 2 },
  });
  await expect(panel.locator(".map-inspection")).toContainText(
    "0.0 km from vent",
  );
  const before = await panel.locator(".map-inspection").textContent();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2 + 40,
    bounds!.y + bounds!.height / 2 + 30,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(panel.locator(".map-inspection")).toHaveText(before!);
  await panel
    .getByRole("button", { name: "Reset hazard map", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /Check toxic gases before re-entry/ }),
  ).toBeVisible();
  await panel.screenshot({
    path: `/private/tmp/ashline-aftermath-${testInfo.project.name}.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Edit scenario", exact: true })
    .click();
  const lab = page.locator(".scenario-lab");
  await lab
    .getByRole("button", { name: "Inspect main path end", exact: true })
    .click();
  await expect(page.getByLabel("Latitude", { exact: true })).not.toHaveValue(
    "",
  );
  await expect(lab.locator(".map-inspection")).toContainText("bearing 180°");
  await page
    .getByRole("slider", { name: "Explosivity · VEI", exact: true })
    .fill("0");
  await expect(lab.locator("[data-lava-path]")).toHaveCount(3);
});

test("global reference map supports search, focus, pan, pinch, and selection", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const map = page.getByRole("group", {
    name: "Interactive global volcano map",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Focus selected", exact: true })
    .click();
  await expect(page.getByLabel("Global map zoom")).toHaveText("6.0×");
  await map.press("Enter");
  await expect(page.locator(".atlas-pick-list")).toContainText("Merapi");
  const camera = await map.locator("g").first().getAttribute("transform");
  await map.press("ArrowRight");
  await expect(map.locator("g").first()).not.toHaveAttribute(
    "transform",
    camera!,
  );
  await map.press("Home");
  await expect(page.getByLabel("Global map zoom")).toHaveText("1.0×");
  await page
    .getByRole("textbox", { name: "Search map volcanoes", exact: true })
    .fill("Merapi");
  await expect(
    page.getByRole("textbox", { name: "Search volcanoes", exact: true }),
  ).toHaveValue("Merapi");
  await page.getByRole("button", { name: "Fit matches", exact: true }).click();
  expect(
    Number(
      (await page.getByLabel("Global map zoom").innerText()).replace("×", ""),
    ),
  ).toBeGreaterThan(1);
  await page
    .getByRole("button", { name: "Focus selected", exact: true })
    .click();
  const box = await map.boundingBox();
  await map.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await expect(page.locator(".atlas-pick-list")).toContainText("Merapi");
  await page
    .locator(".atlas-pick-list")
    .getByRole("button", { name: /Merapi Indonesia/ })
    .click();
  await expect(page.locator(".dossier h2")).toHaveText("Merapi");
  await page
    .getByRole("button", { name: "Reset map zoom", exact: true })
    .click();
  await map.scrollIntoViewIfNeeded();
  const touchBox = (await map.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const firstTouch = { x: touchBox.x + 80, y: touchBox.y + 100, id: 1 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      firstTouch,
      { x: touchBox.x + 180, y: touchBox.y + 100, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      firstTouch,
      { x: touchBox.x + 260, y: touchBox.y + 100, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
  await expect(page.getByLabel("Global map zoom")).toHaveText("1.8×");
  await page
    .getByRole("textbox", { name: "Search map volcanoes", exact: true })
    .fill("no-such-volcano-xyz");
  await expect(page.locator(".atlas-empty")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Focus selected", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Clear map search", exact: true })
    .click();
  await page.getByRole("button", { name: "Expand map", exact: true }).click();
  await expect(page.locator(".atlas-layout")).toHaveClass(/atlas-expanded/);
  await expect(
    page.getByRole("button", { name: "Build a scenario", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Collapse map", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset map zoom", exact: true })
    .click();
  await page
    .locator(".map-panel")
    .screenshot({
      path: `/private/tmp/ashline-global-${testInfo.project.name}.png`,
    });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
