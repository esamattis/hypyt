import { expect, test } from "./fixtures";

test("try demo logs in with example data and blocks writes", async ({
    page,
}) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try demo" }).first().click();
    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        }),
    ).toBeVisible();

    await page
        .getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        })
        .click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/[^/]+$/);
    await page.getByRole("button", { name: "Save jump" }).click();
    await expect(page).toHaveURL("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
    await expect(
        page.getByText("This account is read-only", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Create account" }),
    ).toHaveCount(0);
    await expect(
        page.getByRole("link", { name: "Back to logbook" }),
    ).toHaveCount(0);

    await page.locator("main").getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/login");
});

test("adding a jump as demo redirects to the read-only page", async ({
    page,
}) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try demo" }).first().click();
    await expect(page).toHaveURL("/logbook");

    await page.goto("/logbook/jumps/new");
    await page.locator('input[name="jumpNumber"]').fill("9999");
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
});
