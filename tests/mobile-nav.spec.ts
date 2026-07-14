import { expect, test, type Page } from "./fixtures";
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

async function expectActiveAction(
    navigation: ReturnType<Page["getByRole"]>,
    activeLabel: string,
) {
    const labels = ["Logbook", "Add jump", "From image"];

    for (const label of labels) {
        const link = navigation.getByRole("link", { name: label, exact: true });
        if (label === activeLabel) {
            await expect(link).toHaveAttribute("aria-current", "page");
        } else {
            await expect(link).not.toHaveAttribute("aria-current");
        }
        await expect(link).toHaveClass(
            label === activeLabel ? /bg-indigo-600/ : /bg-slate-50/,
        );
    }
}

test("desktop header highlights the active action", async ({ page }) => {
    await registerUser(page, "desktop-nav-skydiver", "Desktop Nav Skydiver");

    const header = page.getByRole("banner");
    await expectActiveAction(header, "Logbook");

    await page.goto("/logbook/jumps/new");
    await expectActiveAction(header, "Add jump");

    await page.goto("/logbook/jumps/new/from-image");
    await expectActiveAction(header, "From image");
});

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
        bottomBar.getByRole("link", { name: "Logbook", exact: true }),
    ).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "Add jump", exact: true }),
    ).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "From image", exact: true }),
    ).toBeVisible();
    await expect(bottomBar.getByRole("button", { name: "Menu" })).toBeVisible();
    await expectActiveAction(bottomBar, "Logbook");

    await bottomBar
        .getByRole("link", { name: "Add jump", exact: true })
        .click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/new/);
    await expectActiveAction(bottomBar, "Add jump");

    await page.goto("/logbook/jumps/new");
    await bottomBar.getByRole("link", { name: "Logbook", exact: true }).click();
    await expect(page).toHaveURL("/logbook");

    await bottomBar
        .getByRole("link", { name: "From image", exact: true })
        .click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expectActiveAction(bottomBar, "From image");

    await page.goto("/logbook");
    await openMainMenu(page);
    await expect(page.getByRole("link", { name: "Preferences" })).toBeVisible();
    await page.getByRole("link", { name: "Preferences" }).click();
    await expect(page).toHaveURL("/preferences");
});
