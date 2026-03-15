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

  const notesSection = page
    .getByRole("heading", { name: "Notes" })
    .locator("xpath=ancestor::section[1]");
  const birrField = notesSection.getByLabel("Birr");
  const birrBefore = Number.parseInt(await birrField.inputValue(), 10);
  await notesSection.getByRole("button", { name: "Add" }).click();

  const birrDialog = page.getByRole("dialog", { name: "Adjust Birr" });
  await expect(birrDialog).toBeVisible();
  await birrDialog.getByLabel("Amount to add or subtract").fill("250");
  await birrDialog.getByRole("button", { name: "Apply" }).click();
  await expect(birrField).toHaveValue(String(birrBefore + 250));

  await birrField.fill(String(birrBefore + 125));
  await birrField.press("Tab");
  await expect(birrField).toHaveValue(String(birrBefore + 125));

  const skillsSection = page
    .getByRole("heading", { name: "Skills" })
    .locator("xpath=ancestor::section[1]");
  await expect(skillsSection.getByRole("spinbutton")).toHaveCount(0);
  await expect(skillsSection.getByRole("group", { name: "Dexterity" })).toHaveCount(0);
  await skillsSection.getByRole("button", { name: "Show all" }).click();
  const dexterityTrack = skillsSection.getByRole("group", { name: "Dexterity" });
  await dexterityTrack.getByRole("button", { name: "Dexterity: set to 2" }).click();
  await expect(dexterityTrack).toContainText("2/5");

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
  await gearSection.getByLabel("Quantity").first().fill("3");
  await gearSection.getByLabel("Quantity").first().press("Tab");
  await expect(gearSection.getByText("6/8 half-row units")).toBeVisible();

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
  const persistedSkillsSection = page
    .getByRole("heading", { name: "Skills" })
    .locator("xpath=ancestor::section[1]");
  const persistedDexterityTrack = persistedSkillsSection.getByRole("group", {
    name: "Dexterity",
  });

  await expect(page.getByLabel("Name").first()).toHaveValue("Layla Kassar");
  await expect(page.getByLabel("Background").first()).toHaveValue("Stationary from Mira");
  await expect(page.getByLabel("Origin Culture").first()).toHaveValue("firstcome");
  await expect(page.getByLabel("Home System").first()).toHaveValue("mira");
  await expect(page.getByLabel("Upbringing").first()).toHaveValue("stationary");
  await expect(page.getByLabel("Experience").first()).toHaveValue("12");
  await expect(page.getByLabel("Birr").first()).toHaveValue(String(birrBefore + 125));
  await expect(starterRulesSection.getByText("Stationary starter bundle")).toBeVisible();
  await expect(persistedSkillsSection.getByRole("spinbutton")).toHaveCount(0);
  await expect(persistedDexterityTrack).toContainText("2/5");
  await expect(persistedGearSection.getByLabel("Item").first()).toHaveValue("Custom gear");
  await expect(persistedGearSection.getByLabel("Quantity").first()).toHaveValue("3");
  await expect(page.getByLabel("Other PC").first()).toHaveValue("Sabah al-Malik");
  await expect(
    page.getByRole("button", { name: /Layla Kassar/i }),
  ).toBeVisible();
});

test("desktop layout keeps the full sheet readable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("/");
  await page.getByRole("button", { name: /Sabah al-Malik/i }).click();

  const conditionsSection = page
    .getByRole("heading", { name: "Conditions" })
    .locator("xpath=ancestor::section[1]");
  const hitPointsTrack = conditionsSection.getByRole("group", {
    name: /Hit Points \(max 7\)/i,
  });
  const skillsSection = page
    .getByRole("heading", { name: "Skills" })
    .locator("xpath=ancestor::section[1]");

  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Starter Rules" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weapons" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "People I've Met" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New" })).toBeVisible();
  await expect(skillsSection.getByRole("group", { name: "Dexterity" })).toBeVisible();
  await expect(skillsSection.getByRole("group", { name: "Force" })).toHaveCount(0);
  await skillsSection.getByRole("button", { name: "Show all" }).click();
  await expect(skillsSection.getByRole("group", { name: "Force" })).toBeVisible();
  await hitPointsTrack
    .getByRole("button", { name: "Hit Points (max 7): set to 5" })
    .click();
  await expect(hitPointsTrack).toContainText("5/7");
});

test("remove actions ask for confirmation before deleting data", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("/");

  await page.getByRole("button", { name: "New" }).click();
  const nameField = page.getByLabel("Name").first();
  await nameField.fill("Layla Kassar");
  await nameField.press("Tab");
  await expect(page.getByRole("button", { name: /Layla Kassar/i })).toBeVisible();

  const relationshipsSection = page
    .getByRole("heading", { name: "Relationships" })
    .locator("xpath=ancestor::section[1]");
  await relationshipsSection.getByRole("button", { name: "Add Row" }).click();
  await expect(relationshipsSection.getByLabel("Other PC")).toHaveCount(1);

  await relationshipsSection.getByRole("button", { name: "Remove" }).click();
  const relationshipDialog = page.getByRole("dialog", {
    name: "Remove Relationship?",
  });
  await expect(relationshipDialog).toBeVisible();
  await relationshipDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(relationshipDialog).toHaveCount(0);
  await expect(relationshipsSection.getByLabel("Other PC")).toHaveCount(1);

  await relationshipsSection.getByRole("button", { name: "Remove" }).click();
  await page
    .getByRole("dialog", { name: "Remove Relationship?" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(relationshipsSection.getByLabel("Other PC")).toHaveCount(0);

  await page.getByRole("button", { name: "Team" }).click();
  const notesSection = page
    .getByRole("heading", { name: "Typed Notes" })
    .locator("xpath=ancestor::section[1]");
  const titleFields = notesSection.getByLabel("Title");
  const titleCountBefore = await titleFields.count();
  await notesSection.getByRole("button", { name: "Add Note" }).click();
  await expect(titleFields).toHaveCount(titleCountBefore + 1);

  await notesSection.getByRole("button", { name: "Remove" }).last().click();
  const noteDialog = page.getByRole("dialog", { name: "Remove Note?" });
  await expect(noteDialog).toBeVisible();
  await noteDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(titleFields).toHaveCount(titleCountBefore + 1);

  await notesSection.getByRole("button", { name: "Remove" }).last().click();
  await page
    .getByRole("dialog", { name: "Remove Note?" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(titleFields).toHaveCount(titleCountBefore);

  await page.getByRole("button", { name: /Layla Kassar/i }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete Layla Kassar?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: /Layla Kassar/i })).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog", { name: "Delete Layla Kassar?" })
    .getByRole("button", { name: "Delete Sheet" })
    .click();
  await expect(page.getByRole("button", { name: /Layla Kassar/i })).toHaveCount(0);
});
