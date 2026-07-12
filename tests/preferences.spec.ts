import { expect, test } from "@playwright/test";

test("a skydiver can update preferences and account details", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="username"]').fill("preferences-skydiver");
    await page
        .locator('input[name="displayName"]')
        .fill("Preferences Skydiver");
    await page.locator('input[name="email"]').fill("preferences@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page).toHaveURL("/preferences");
    await page.locator('input[name="displayName"]').fill("Feet Skydiver");
    await page.locator('input[name="email"]').fill("feet@example.test");
    await page.locator('select[name="altitudeUnits"]').selectOption("feet");
    await page
        .locator('select[name="speedUnits"]')
        .selectOption("meters-per-second");
    await page.locator('input[name="password"]').fill("new-parachute");
    await page.locator('input[name="confirmPassword"]').fill("new-parachute");
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("link", { name: /Feet Skydiver's logbook/ }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.getByText("Exit altitude (ft)")).toBeVisible();
    await expect(page.getByText("Opening altitude (ft)")).toBeVisible();

    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page.locator('input[name="displayName"]')).toHaveValue(
        "Feet Skydiver",
    );
    await expect(page.locator('input[name="email"]')).toHaveValue(
        "feet@example.test",
    );
    await expect(page.locator('select[name="altitudeUnits"]')).toHaveValue(
        "feet",
    );
    await expect(page.locator('select[name="speedUnits"]')).toHaveValue(
        "meters-per-second",
    );

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/login");
    await page
        .locator('input[name="usernameOrEmail"]')
        .fill("feet@example.test");
    await page.locator('input[name="password"]').fill("new-parachute");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/logbook");
});
