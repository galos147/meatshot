// Dev helper: logs in and screenshots pages for a visual check.
// Usage: node scripts/screenshot.mjs <outDir> <email> <password> [/path ...] [--mobile]
import { chromium } from "@playwright/test";
import path from "node:path";

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const [outDir, email, password, ...paths] = args.filter((a) => a !== "--mobile");
const base = process.env.BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage(
  mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
);
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE ERROR:", m.text()));

await page.goto(`${base}/login`);
await page.screenshot({ path: path.join(outDir, `login${mobile ? "-m" : ""}.png`) });
await page.fill("#email", email);
await page.fill("#password", password);
await Promise.all([page.waitForURL("**/dashboard", { timeout: 30_000 }).catch(() => {}), page.click("button[type=submit]")]);

for (const p of paths) {
  await page.goto(`${base}${p}`, { waitUntil: "networkidle" });
  const name = p.replace(/\//g, "_").replace(/^_/, "") || "root";
  await page.screenshot({ path: path.join(outDir, `${name}${mobile ? "-m" : ""}.png`), fullPage: true });
  console.log("shot", p, page.url());
}
await browser.close();
