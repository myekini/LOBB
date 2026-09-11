import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.LOBB_BASE_URL ?? "http://127.0.0.1:3000";
const output = "artifacts/baseline";
const routes = ["/", "/coaches", "/auth/login", "/book/confirm"];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1024 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    for (const route of routes) {
      await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
      const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
      await page.screenshot({ path: `${output}/${name}-${viewport.name}.png`, fullPage: true });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
