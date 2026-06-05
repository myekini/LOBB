import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3000/coach/profile', { waitUntil: 'networkidle', timeout: 15000 });
await page.screenshot({ path: 'coach-profile.png', fullPage: true });
console.log('final url:', page.url());
await browser.close();
