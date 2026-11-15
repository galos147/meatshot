import { expect, type Page } from "@playwright/test";

// Local development accounts created by `npm run seed:dev`.
export const USERS = {
  admin: { email: "admin@meatstock.local", password: "Admin-12345" },
  seller: { email: "seller@meatstock.local", password: "Seller-12345" },
  warehouse: { email: "warehouse@meatstock.local", password: "Store-12345" },
};

export async function login(page: Page, who: keyof typeof USERS) {
  await page.goto("/login");
  await page.getByLabel("אימייל").fill(USERS[who].email);
  await page.getByLabel("סיסמה").fill(USERS[who].password);
  await page.getByRole("button", { name: "התחברות" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
