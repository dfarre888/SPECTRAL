#!/usr/bin/env node
/**
 * Copy Cesium static assets to public/ for on-prem / air-gap deployments.
 * Run before `next build` — Helm sets NEXT_PUBLIC_CESIUM_BASE_URL=/static/Cesium.
 *
 * Cesium 1.116 uses chunk-based Workers (no cesiumWorkerBootstrapper.js).
 * Workers resolve relative to CESIUM_BASE_URL/Workers/ — must match this path.
 */
import { cpSync, mkdirSync, existsSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'node_modules/cesium/Build/Cesium')
const dest = path.join(root, 'public/static/Cesium')

if (!existsSync(src)) {
  console.error('Cesium not installed — run npm install')
  process.exit(1)
}

mkdirSync(dest, { recursive: true })
for (const dir of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) {
  cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true })
}
cpSync(path.join(src, 'Cesium.js'), path.join(dest, 'Cesium.js'))

const workersDir = path.join(dest, 'Workers')
const workerCount = existsSync(workersDir) ? readdirSync(workersDir).length : 0
if (workerCount < 10) {
  console.error(`Cesium Workers incomplete (${workerCount} files) — check node_modules/cesium`)
  process.exit(1)
}

console.log(`Cesium assets copied to public/static/Cesium (${workerCount} worker chunks)`)
console.log('Set NEXT_PUBLIC_CESIUM_BASE_URL=/static/Cesium for Helm / air-gap')
