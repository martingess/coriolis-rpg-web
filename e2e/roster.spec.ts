import { expect, test } from "@playwright/test";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9K6nxsQAAAABJRU5ErkJggg==",
  "base64",
);

test("mobile roster flow persists edits and inventory", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Coriolis Dossier" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Sabah al-Malik/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nassim Vale/i })).toBeVisible();

  await page.getByRole("button", { name: "New" }).click();

  const nameField = page.getByLabel("Name").first();
  await nameField.fill("Layla Kassar");
  await nameField.press("Tab");
  await expect(page.getByRole("button", { name: /Layla Kassar/i })).toBeVisible();

  const backgroundField = page.getByLabel("Background").first();
  await backgroundField.fill("Stationary from Mira");
  await backgroundField.press("Tab");
  await page.getByLabel("Origin Culture").first().selectOption("firstcome");
  await page.getByLabel("Home System").first().selectOption("mira");
  await page.getByLabel("Upbringing").first().selectOption("stationary");

  const starterRulesSection = page
    .getByRole("heading", { name: "Starter Rules" })
    .locator("xpath=ancestor::section[1]");
  await expect(starterRulesSection.getByText("Stationary starter bundle")).toBeVisible();
  await expect(
    starterRulesSection.getByText("Base upbringing reputation", { exact: true }),
  ).toBeVisible();
  await starterRulesSection.getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("heading", { name: "Starter Rules" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show Starter Rules" })).toBeVisible();
  await page.getByRole("button", { name: "Show Starter Rules" }).click();
  await expect(page.getByRole("heading", { name: "Starter Rules" })).toBeVisible();

  const experienceField = page.getByLabel("Experience").first();
  await experienceField.fill("12");
  await experienceField.press("Tab");

  await page.locator('input[type="file"]').setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await expect(page.getByText("Portrait updated.")).toBeVisible();

  const gearSection = page
    .getByRole("heading", { name: "Gear" })
    .locator("xpath=ancestor::section[1]");
  await gearSection.getByRole("button", { name: "Add From Catalog" }).click();
  await page.getByRole("button", { name: /Custom gear/i }).click();
  await expect(page.getByText("Custom gear")).toBeVisible();

  const relationshipsSection = page
    .getByRole("heading", { name: "Relationships" })
    .locator("xpath=ancestor::section[1]");
  await relationshipsSection.getByRole("button", { name: "Add Row" }).click();
  await expect(page.getByLabel("Other PC").first()).toHaveValue("Sabah al-Malik");
  await relationshipsSection.getByRole("button", { name: "Set Buddy" }).first().click();
  await expect(relationshipsSection.getByRole("button", { name: "Buddy" }).first()).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Layla Kassar/i }).click();
  const persistedGearSection = page
    .getByRole("heading", { name: "Gear" })
    .locator("xpath=ancestor::section[1]");

  await expect(page.getByLabel("Name").first()).toHaveValue("Layla Kassar");
  await expect(page.getByLabel("Background").first()).toHaveValue("Stationary from Mira");
  await expect(page.getByLabel("Origin Culture").first()).toHaveValue("firstcome");
  await expect(page.getByLabel("Home System").first()).toHaveValue("mira");
  await expect(page.getByLabel("Upbringing").first()).toHaveValue("stationary");
  await expect(page.getByLabel("Experience").first()).toHaveValue("12");
  await expect(starterRulesSection.getByText("Stationary starter bundle")).toBeVisible();
  await expect(persistedGearSection.getByLabel("Item").first()).toHaveValue("Custom gear");
  await expect(page.getByLabel("Other PC").first()).toHaveValue("Sabah al-Malik");
  await expect(
    page.getByRole("button", { name: /Layla Kassar/i }),
  ).toBeVisible();
});

test("desktop layout keeps the full sheet readable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Starter Rules" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weapons" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "People I've Met" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New" })).toBeVisible();
});
