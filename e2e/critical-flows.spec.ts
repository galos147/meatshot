import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("wrong password shows a Hebrew error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("אימייל").fill("seller@meatstock.local");
  await page.getByLabel("סיסמה").fill("wrong-password");
  await page.getByRole("button", { name: "התחברות" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "שגויים" })).toContainText("אימייל או סיסמה שגויים");
});

test("anonymous visitors are sent to login", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login/);
});

test("sales employee completes a sale and stock goes down", async ({ page }) => {
  await login(page, "seller");
  await page.goto("/sales/new");

  const card = page.getByRole("button", { name: /חזה עוף/ }).first();
  const before = Number((await card.innerText()).match(/זמין ([\d.,]+)/)![1].replace(/,/g, ""));

  await page.getByPlaceholder(/חיפוש מוצר/).fill("CH-201");
  await page.getByPlaceholder(/חיפוש מוצר/).press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("מומלץ (FEFO)")).toBeVisible();
  await dialog.getByLabel("משקל (ק״ג)").fill("0.75");
  await dialog.getByRole("button", { name: "הוספה לסל" }).click();

  await page.getByRole("button", { name: "אישור מכירה" }).click();
  await expect(page.getByText("המכירה נרשמה")).toBeVisible();
  await page.getByRole("button", { name: "מכירה חדשה" }).click();

  await page.reload();
  const after = Number((await page.getByRole("button", { name: /חזה עוף/ }).first().innerText()).match(/זמין ([\d.,]+)/)![1].replace(/,/g, ""));
  expect(Math.round((before - after) * 1000) / 1000).toBe(0.75);
});

test("kosher requirement hides non-matching batches in the POS", async ({ page }) => {
  await login(page, "seller");
  await page.goto("/sales/new");
  await page.getByRole("button", { name: "בד״ץ בית יוסף" }).click();
  await page.getByRole("button", { name: /פרגיות/ }).first().click();
  const dialog = page.getByRole("dialog");
  // All seeded פרגיות batches are certified by other bodies → nothing sellable.
  await expect(dialog.getByText("הכשר לא תואם").first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: "הוספה לסל" })).toBeDisabled();
});

test("warehouse worker receives goods and a new batch is created", async ({ page }) => {
  await login(page, "warehouse");
  await page.goto("/receiving/new");

  await page.getByLabel("ספק / מפעל").click();
  await page.getByRole("option", { name: "עוף הדרום" }).click();

  await page.getByLabel("מוצר", { exact: true }).click();
  await page.getByPlaceholder("חיפוש...").fill("שוקיים");
  await page.getByRole("option", { name: /שוקיים עוף/ }).click();

  await page.getByLabel('משקל (ק"ג)').fill("12.345");
  await page.getByLabel("מספר אריזות").fill("6");
  await page.getByLabel("תאריך תפוגה").fill(new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "אישור קבלה" }).click();

  await expect(page).toHaveURL(/\/receiving\/[0-9a-f-]{36}/);
  // The weight shows both on the line and in the receipt total.
  await expect(page.getByText("12.345").first()).toBeVisible();
  await expect(page.getByText(/^B\d{6}-\d{4}$/).first()).toBeVisible();
});

test("sales employee cannot open admin screens", async ({ page }) => {
  await login(page, "seller");
  await page.goto("/users");
  await expect(page).toHaveURL(/\/dashboard\?denied=1/);
  await expect(page.getByRole("link", { name: "עובדים והרשאות" })).toHaveCount(0);
});

test("admin can open every screen without a server error", async ({ page }) => {
  test.setTimeout(180_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(`${page.url()}: ${e.message}`));
  await login(page, "admin");

  const open = async (path: string) => {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("main").first(), path).toBeVisible();
  };

  const screens = [
    "/dashboard", "/sales/new", "/sales", "/inventory", "/batches", "/receiving", "/receiving/new",
    "/transfers", "/transactions", "/alerts", "/reports", "/products", "/categories", "/suppliers",
    "/kosher", "/warehouses", "/locations", "/users", "/settings",
  ];
  for (const path of screens) await open(path);

  // Every report, discovered from the reports index.
  await page.goto("/reports");
  const reports = await page.locator('a[href^="/reports/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  expect(reports.length).toBeGreaterThanOrEqual(12);
  for (const path of reports) await open(path);

  // "Stock in fridge" detail screen.
  await page.goto("/locations");
  const location = await page.locator('a[href^="/locations/"]').first().getAttribute("href");
  await open(location!);

  expect(pageErrors).toEqual([]);
});

test("@mobile wide screens fit a phone without sideways scrolling", async ({ page }) => {
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await login(page, "admin");

  await page.goto("/reports/sales-daily");
  await expect(page.getByText("מתאריך")).toBeVisible();
  expect(await overflow(), "date-filtered report").toBeLessThanOrEqual(1);

  await page.goto("/batches");
  await page.locator("tbody tr").first().click();
  await expect(page).toHaveURL(/\/batches\/[0-9a-f-]{36}/);
  await expect(page.getByText("פרטי האצווה")).toBeVisible();
  expect(await overflow(), "batch page").toBeLessThanOrEqual(1);
});

test("@mobile POS works on a phone", async ({ page }) => {
  await login(page, "seller");
  await page.goto("/sales/new");
  await page.getByRole("button", { name: /אסאדו/ }).first().click();
  await page.getByRole("dialog").getByLabel("משקל (ק״ג)").fill("0.5");
  await page.getByRole("dialog").getByRole("button", { name: "הוספה לסל" }).click();
  await page.getByRole("button", { name: /סל \(1\)/ }).click();
  await expect(page.getByRole("button", { name: "אישור מכירה" })).toBeVisible();
});
