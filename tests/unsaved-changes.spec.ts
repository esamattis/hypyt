import { expect, test } from "./fixtures";
import { openManageLogbook } from "./helpers";

test("edited forms warn before leaving via a link", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("unsaved-skydiver");
    await page.locator('input[name="displayName"]').fill("Unsaved Skydiver");
    await page.locator('input[name="email"]').fill("unsaved@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await expect(page).toHaveURL("/logbook/gear/new");

    await page.locator('input[name="name"]').fill("Dirty canopy");

    await page.getByRole("link", { name: "Cancel" }).click();

    await expect(
        page.getByRole("heading", { name: "Unsaved changes" }),
    ).toBeVisible();
    await expect(page).toHaveURL("/logbook/gear/new");

    await page.getByRole("button", { name: "Close" }).click();
    await expect(
        page.getByRole("heading", { name: "Unsaved changes" }),
    ).toBeHidden();
    await expect(page).toHaveURL("/logbook/gear/new");
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Dirty canopy",
    );

    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(
        page.getByRole("heading", { name: "Unsaved changes" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Leave" }).click();
    await expect(page).toHaveURL("/logbook/gear");
});
