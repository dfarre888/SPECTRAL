#!/usr/bin/env node
/**
 * Fetch OSINT platform images from Wikimedia Commons → public/assets/platforms/
 * Generates lib/platforms/image-manifest.ts
 * Run: node scripts/fetch-platform-images.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Avoid /platforms/* — conflicts with app/(main)/platforms/[id] dynamic route */
const OUT_DIR = path.join(__dirname, '../public/assets/platforms')
const PUBLIC_PREFIX = '/assets/platforms'
const MANIFEST_TS = path.join(__dirname, '../lib/platforms/image-manifest.ts')

/** id → ordered Wikimedia Commons filenames (any extension) */
const PLATFORM_FILES = {
  'mq-9-reaper': ['MQ-9_Reaper_in_flight_(2007).jpg'],
  'shahed-136': ['HESA_Shahed_136.jpg'],
  'tb2-bayraktar': ['Bayraktar_TB2.jpg'],
  'fpv-fibre-optic': ['UA fiber-optic FPV drone 01.webp', 'FPV Quadrocopter.jpg', '71188-fpv-components.jpg'],
  'lancet-3': ['ZALA_Lancet-3.jpg'],
  v2u: ['Uvision Hero-90 at ILA-2022.jpg', 'Green Dragon Loitering Munition at ADAS 2018.jpg'],
  'uj-22-airborne': ['UKRJET UJ-22 Airborne, Kyiv 2021, 07.jpg'],
  'uj-26-bober': ['Бобер 02.jpg'],
  'baba-yaga': ['Drone R18, Ukraine 1.jpg', 'Hexacopter.jpg'],
  vampire: ['Drone R18, Ukraine 1.jpg'],
  kazhan: ['FPV Quadrocopter.jpg', '71188-fpv-components.jpg'],
  'fpv-interceptor': ['P1-Sun interceptor drone at Dubai Airshow 2025.jpg', '1020th Regiment Drone Interceptor Battalion.png'],
  'rotem-l': ['Green Dragon Loitering Munition at ADAS 2018.jpg'],
  'kargu-2': ['STM Kargu.png', 'STM Alpagu Tactical Attack UAV, Kyiv, 2019 01.jpg'],
  alpagu: ['STM Alpagu Tactical Attack UAV, Kyiv, 2019 01.jpg'],
  'wing-loong-1': ['Wing Loong (2).jpg', 'Wing_Loong.jpg'],
  'wing-loong-2': ['Wing Loong II fron view.jpg', 'Wing Loong II side view.jpg'],
  'ch-4-rainbow': ['CH-4 at Airshow China Zhuhai 2022.jpg'],
  'ch-5-rainbow': ['CH-5 at Airshow China Zhuhai 2022.jpg'],
  'tb-001': ['Tengden_TB-001.jpg'],
  'mq-1c-gray-eagle': ['MQ-1C Warrior (2005-08-11).jpg'],
  'rq-7b-shadow': ['Shadow 200 UAV.jpg', 'AAI Corporation RQ-7A Shadow 200 1.jpg'],
  'mq-25-stingray': ['Boeing MQ-25 Stingray.JPG', 'MQ-25 T1 Stingray test aircraft takes off.jpg'],
  'anduril-anvil': [
    'Anduril Ghost-X UAS prepared for flight near Mihail Kogălniceanu Air Base, Romania.jpg',
    'Drone Anduril YFQ-44 au Salon du Bourget 2025.jpg',
  ],
  'skydio-x10d': [
    'Skydio X10D.jpg',
    'Skydio SR47PCV X10 (10-7-2025).jpg',
    'Skydio X2D.jpg',
  ],
  'switchblade-600': [
    'AeroVironment Switchblade 600.jpg',
    'Switchblade 600 loitering munition.jpg',
  ],
  'switchblade-300': ['AeroVironment Switchblade 300.jpg'],
  'phoenix-ghost': ['Aevex Phoenix Ghost UAV.jpg', 'Phoenix Ghost drone Ukraine.jpg'],
  'aeronautics-orbiter': ['Aeronautics Orbiter UAV.jpg', 'Orbiter 3b UAV.jpg'],
  'rq-4-global-hawk': ['Northrop Grumman RQ-4 Global Hawk.jpg', 'RQ-4 Global Hawk 04.jpg'],
  'global-hawk': ['Northrop Grumman RQ-4 Global Hawk.jpg'],
  'mohajer-6': ['Mohajer-6 UAV.jpg', 'Mohajer 6 drone.jpg'],
  'shahed-129': ['Shahed 129 UAV.jpg', 'HESA Shahed 129.jpg'],
  'geran-2': ['HESA Shahed 136.jpg'],
  'millennium-35mm': ['OTO Melara 35mm Millennium Gun.jpg', 'Millennium naval gun.jpg'],
  'phalanx-ciws': ['Phalanx CIWS USS Monterey.jpg', 'Phalanx CIWS fire.jpg'],
  'goalkeeper-ciws': ['Goalkeeper CIWS.jpg'],
  searam: ['SeaRAM launcher.jpg', 'RIM-116 Rolling Airframe Missile.jpg'],
  'iron-beam': ['Iron Beam laser weapon.jpg'],
  'ghost-bat': ['Boeing MQ-28 Ghost Bat.jpg', 'MQ-28A Ghost Bat.jpg'],
  'bayraktar-akinci': ['Bayraktar Akıncı.jpg'],
  'kizilelma': ['Bayraktar Kızılelma.jpg'],
  'hermes-900': ['Elbit Hermes 900.jpg'],
  'hermes-450': ['Elbit Hermes 450.jpg'],
  'puma-ae': ['AeroVironment RQ-20 Puma.jpg'],
  'scan-eagle': ['Insitu ScanEagle.jpg'],
  'black-hornet': ['Black Hornet Nano UAV.jpg'],
  'orbiter-4': ['Aeronautics Orbiter 4 UAV.jpg'],
}

/** id → Wikimedia Commons search term (used when curated filenames are unknown) */
const PLATFORM_SEARCH = {
  'ncsist-cardinal': 'NCSIST Cardinal UAV Taiwan',
  'dji-mavic-3': 'DJI Mavic 3 drone',
  'matrice-300': 'DJI Matrice 300 RTK',
  'magura-v5': 'Magura V5 USV Ukraine',
  'houthi-owa-maritime': 'Houthi Samad drone',
  'samad-2': 'Samad-2 drone Yemen',
  'zala-aero': 'ZALA Lancet drone',
  'supercam-s350': 'Supercam S350 UAV',
  'privet-82': 'Privet 82 drone Russia',
  'st-35-silent-thunder': 'Silent Thunder loitering munition Ukraine',
  'eos-slinger': 'EOS Slinger C-UAS',
  'drone-dome': 'Rafael Drone Dome',
  'drone-shield-dronegun': 'DroneShield DroneGun',
  'anduril-pulsar-l': 'Anduril Pulsar RF jammer',
  'epirus-leonidas': 'Epirus Leonidas HPM',
  'coyote-block2': 'Coyote Block 2 interceptor',
  'dragonfire': 'DragonFire laser UK',
  'hq-17': 'HQ-17 air defense',
  'starstreak-hvm': 'Starstreak HVM',
  'smash-hopper': 'Smart Shooter SMASH Hopper',
}

function commonsUrl(filename, width = 800) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${width}`
}

function extFromFilename(filename) {
  const m = filename.match(/\.(jpe?g|png|webp)$/i)
  return m ? m[0].toLowerCase() : '.jpg'
}

function loadExistingManifest() {
  const manifest = {}
  if (!fs.existsSync(OUT_DIR)) return manifest
  for (const file of fs.readdirSync(OUT_DIR)) {
    const match = file.match(/^(.+)\.(jpe?g|png|webp)$/i)
    if (!match) continue
    const full = path.join(OUT_DIR, file)
    if (fs.statSync(full).size > 2500) {
      manifest[match[1]] = `${PUBLIC_PREFIX}/${file}`
    }
  }
  return manifest
}

async function download(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'SpectralPlatformLibrary/1.0 (OSINT training)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`Not an image (${type})`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 2500) throw new Error('Image too small')
  return buf
}

async function searchCommons(term) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: term,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '800',
    format: 'json',
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'SpectralPlatformLibrary/1.0 (OSINT training)' },
  })
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`)
  const data = await res.json()
  const pages = Object.values(data.query?.pages ?? {})
  const reject = /logo|variation|NARA|\.djvu|emblem|icon|badge|diagram only/i
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info?.mime?.startsWith('image/')) continue
    if ((info.size ?? 0) < 2500) continue
    const title = page.title?.replace(/^File:/, '')
    if (!title || reject.test(title)) continue
    return title
  }
  return null
}

async function fetchPlatform(id, files) {
  for (const file of files) {
    const ext = extFromFilename(file)
    const dest = path.join(OUT_DIR, `${id}${ext}`)
    if (fs.existsSync(dest) && fs.statSync(dest).size > 2500) {
      return { id, status: 'skip', file, path: `${PUBLIC_PREFIX}/${id}${ext}` }
    }
    try {
      const buf = await download(commonsUrl(file))
      fs.writeFileSync(dest, buf)
      return { id, status: 'ok', file, path: `${PUBLIC_PREFIX}/${id}${ext}`, size: buf.length }
    } catch {
      // try next
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return { id, status: 'missing' }
}

async function fetchPlatformSearch(id, term) {
  const destJpg = path.join(OUT_DIR, `${id}.jpg`)
  if (fs.existsSync(destJpg) && fs.statSync(destJpg).size > 2500) {
    return { id, status: 'skip', path: `${PUBLIC_PREFIX}/${id}.jpg` }
  }
  try {
    const file = await searchCommons(term)
    if (!file) return { id, status: 'missing' }
    const ext = extFromFilename(file)
    const dest = path.join(OUT_DIR, `${id}${ext}`)
    const buf = await download(commonsUrl(file))
    fs.writeFileSync(dest, buf)
    return { id, status: 'ok', file, path: `${PUBLIC_PREFIX}/${id}${ext}`, size: buf.length }
  } catch {
    return { id, status: 'missing' }
  }
}

function writeManifest(manifest) {
  const lines = [
    '/** Auto-generated by scripts/fetch-platform-images.mjs — do not edit manually */',
    'export const PLATFORM_IMAGE_SRC: Record<string, string> = {',
  ]
  for (const [id, src] of Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`  '${id}': '${src}',`)
  }
  lines.push('}', '')
  fs.writeFileSync(MANIFEST_TS, lines.join('\n'))
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const manifest = loadExistingManifest()
  const results = []

  for (const [id, files] of Object.entries(PLATFORM_FILES)) {
    const result = await fetchPlatform(id, files)
    results.push(result)
    if (result.path) manifest[id] = result.path
    if (result.status === 'ok') {
      console.log(`✓ ${id} ← ${result.file} (${Math.round(result.size / 1024)} KB)`)
    } else if (result.status === 'skip') {
      console.log(`· ${id} (cached)`)
    } else {
      console.warn(`✗ ${id}`)
    }
    await new Promise((r) => setTimeout(r, 700))
  }

  for (const [id, term] of Object.entries(PLATFORM_SEARCH)) {
    if (manifest[id]) {
      console.log(`· ${id} (already in manifest)`)
      continue
    }
    const result = await fetchPlatformSearch(id, term)
    results.push(result)
    if (result.path) manifest[id] = result.path
    if (result.status === 'ok') {
      console.log(`✓ ${id} ← search:${result.file} (${Math.round(result.size / 1024)} KB)`)
    } else if (result.status === 'skip') {
      console.log(`· ${id} (cached)`)
    } else {
      console.warn(`✗ ${id} (search)`)
    }
    await new Promise((r) => setTimeout(r, 900))
  }

  writeManifest(manifest)
  const ok = Object.keys(manifest).length
  console.log(`\nDone: ${ok} images — manifest → lib/platforms/image-manifest.ts`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
