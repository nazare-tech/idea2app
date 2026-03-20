import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'tmp-projects-empty-state.html');
const outputPath = path.join(root, 'projects-empty-state-screenshot.png');

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(outputPath);
} finally {
  await browser.close();
}
