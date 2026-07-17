import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const BASE = 'http://localhost:3001';
const OUT = path.join(process.cwd(), 'docs/ux-audit/screenshots');

const PAGES = [
  { slug: 'home', path: '/' },
  { slug: 'platforms', path: '/platforms' },
  { slug: 'platform-mq9', path: '/platforms/mq-9-reaper' },
  { slug: 'platform-mavic3', path: '/platforms/dji-mavic-3' },
  { slug: 'spectrum', path: '/spectrum' },
  { slug: 'map', path: '/map' },
  { slug: 'gnss', path: '/gnss' },
  { slug: 'defeat', path: '/defeat' },
  { slug: 'compare', path: '/compare' },
  { slug: 'overlay', path: '/overlay' },
  { slug: 'conflict', path: '/conflict' },
  { slug: 'conflicts', path: '/conflicts' },
  { slug: 'conflicts-ukraine', path: '/conflicts/ukraine-naval-usv' },
  { slug: 'arena', path: '/arena' },
  { slug: 'planner', path: '/planner' },
  { slug: 'pcm', path: '/pcm' },
  { slug: 'pcm-scenario', path: '/pcm/scenario' },
  { slug: 'pcm-force-design', path: '/pcm/force-design' },
  { slug: 'pcm-exercise', path: '/pcm/exercise/demo-exercise' },
  { slug: 'pcm-aar', path: '/pcm/exercise/demo-exercise/aar' },
  { slug: 'currency', path: '/currency' },
  { slug: 'economics', path: '/economics' },
  { slug: 'operations-import', path: '/operations/import' },
  { slug: 'login', path: '/login' },
];

const MOBILE_SLUGS = new Set([
  'home', 'platforms', 'platform-mq9', 'spectrum', 'map', 'gnss', 'defeat',
  'conflicts', 'arena', 'login', 'pcm',
]);

async function capturePage(page, { slug, path: route }, results) {
  const url = BASE + route;
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`.slice(0, 300)));
  page.on('requestfailed', (req) => {
    failedRequests.push({
      url: req.url().slice(0, 200),
      failure: req.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url().slice(0, 200), status: res.status() });
    }
  });

  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    status = resp?.status() ?? 0;
    await page.waitForTimeout(2000);
  } catch (e) {
    results.push({ slug, url, status, error: String(e.message), consoleErrors, failedRequests });
    return;
  }

  const desktopPath = path.join(OUT, `${slug}-1440x900.png`);
  await page.screenshot({ path: desktopPath, fullPage: true });

  let mobilePath = null;
  if (MOBILE_SLUGS.has(slug)) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    mobilePath = path.join(OUT, `${slug}-390x844.png`);
    await page.screenshot({ path: mobilePath, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  const title = await page.title();
  const hasBanner = await page.locator('.classification-banner').count();
  const bodyText = (await page.locator('body').innerText()).slice(0, 500);

  results.push({
    slug,
    url,
    status,
    title,
    hasClassificationBanner: hasBanner > 0,
    desktopScreenshot: desktopPath,
    mobileScreenshot: mobilePath,
    consoleErrorCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 10),
    failedRequestCount: failedRequests.length,
    failedRequests: failedRequests.slice(0, 15),
    bodyPreview: bodyText.replace(/\s+/g, ' ').slice(0, 200),
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results = [];

  for (const p of PAGES) {
    console.log(`Capturing ${p.slug}...`);
    await capturePage(page, p, results);
  }

  await browser.close();
  await writeFile(
    path.join(process.cwd(), 'docs/ux-audit/capture-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Done:', results.length, 'pages');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
