import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const BASE = 'http://localhost:3001'
const OUT = path.join(process.cwd(), 'docs/ux-audit/phase3')

const PAGES = [
  { slug: 'home', path: '/' },
  { slug: 'platforms', path: '/platforms' },
  { slug: 'platform-mq9', path: '/platforms/mq-9-reaper' },
  { slug: 'platform-mavic3', path: '/platforms/dji-mavic-3' },
  { slug: 'spectrum', path: '/spectrum' },
  { slug: 'map', path: '/map' },
  { slug: 'gnss', path: '/gnss' },
  { slug: 'defeat', path: '/defeat' },
  { slug: 'compare', path: '/compare?a=shahed-136&b=mq-9-reaper' },
  { slug: 'overlay', path: '/overlay' },
  { slug: 'conflict', path: '/conflict' },
  { slug: 'conflicts', path: '/conflicts' },
  { slug: 'conflicts-ukraine', path: '/conflicts/ukraine-naval-usv' },
  { slug: 'arena', path: '/arena' },
  { slug: 'planner', path: '/planner' },
  { slug: 'pcm', path: '/pcm' },
  { slug: 'pcm-scenario', path: '/pcm/scenario' },
  { slug: 'pcm-force-design', path: '/pcm/force-design' },
  { slug: 'pcm-exercise', path: '/pcm/exercise/EX-KYIV-OWA-2026' },
  { slug: 'pcm-aar', path: '/pcm/exercise/EX-KYIV-OWA-2026/aar' },
  { slug: 'currency', path: '/currency' },
  { slug: 'economics', path: '/economics' },
  { slug: 'operations-import', path: '/operations/import' },
  { slug: 'login', path: '/login' },
]

const MOBILE_SLUGS = new Set([
  'home', 'platforms', 'platform-mq9', 'spectrum', 'map', 'gnss', 'defeat',
  'conflicts', 'arena', 'login', 'pcm',
])

const HEAVY_ROUTES = new Set(['arena', 'map', 'pcm-exercise', 'spectrum'])

async function capturePage(page, { slug, path: route }, results) {
  const url = `${BASE}${route}`
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message)))

  try {
    const waitUntil = HEAVY_ROUTES.has(slug) ? 'domcontentloaded' : 'networkidle'
    const timeout = HEAVY_ROUTES.has(slug) ? 90000 : 45000
    await page.goto(url, { waitUntil, timeout })
    await page.waitForTimeout(HEAVY_ROUTES.has(slug) ? 3000 : 1500)

    const desktopPath = path.join(OUT, `${slug}-1440x900.png`)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: desktopPath, fullPage: false })

    let mobilePath = null
    if (MOBILE_SLUGS.has(slug)) {
      mobilePath = path.join(OUT, `${slug}-390x844.png`)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForTimeout(500)
      await page.screenshot({ path: mobilePath, fullPage: false })
    }

    results.push({ slug, route, ok: true, errors, desktopPath, mobilePath })
  } catch (err) {
    results.push({ slug, route, ok: false, errors: [...errors, String(err)] })
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const results = []

  for (const entry of PAGES) {
    await capturePage(page, entry, results)
  }

  await browser.close()
  await writeFile(path.join(OUT, 'capture-results.json'), JSON.stringify(results, null, 2))

  const failed = results.filter((r) => !r.ok)
  const warned = results.filter((r) => r.ok && r.errors.length > 0)
  console.log(`Captured ${results.length} routes; ${failed.length} failed; ${warned.length} with console warnings`)
  if (failed.length) {
    console.log(JSON.stringify(failed, null, 2))
    process.exit(1)
  }
}

main()
