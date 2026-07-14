import { expect, test, type Page } from "@playwright/test";
import { openMainMenu } from "./helpers";

async function registerUser(page: Page, username: string, displayName: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(displayName);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
}

test("mobile navigation uses the bottom bar for actions and menu", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await registerUser(page, "mobile-nav-skydiver", "Mobile Nav Skydiver");

    const bottomBar = page.getByRole("navigation", {
        name: "Logbook actions",
    });
    await expect(bottomBar).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "Add jump", exact: true }),
    ).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "From image", exact: true }),
    ).toBeVisible();
    await expect(bottomBar.getByRole("button", { name: "Menu" })).toBeVisible();

    await bottomBar
        .getByRole("link", { name: "Add jump", exact: true })
        .click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/new/);

    await page.goto("/logbook");
    await bottomBar
        .getByRole("link", { name: "From image", exact: true })
        .click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");

    await page.goto("/logbook");
    await openMainMenu(page);
    await expect(page.getByRole("link", { name: "Preferences" })).toBeVisible();
    await page.getByRole("link", { name: "Preferences" }).click();
    await expect(page).toHaveURL("/preferences");
});
