import type { Page } from "@playwright/test";

export async function openMainMenu(page: Page) {
    await page.getByRole("button", { name: "Menu" }).click();
}

export async function openManageLogbook(page: Page) {
    await openMainMenu(page);
}

export async function logOut(page: Page) {
    await openMainMenu(page);
    await page.getByRole("button", { name: "Log out" }).click();
}
