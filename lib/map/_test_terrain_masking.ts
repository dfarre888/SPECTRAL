import {
  domeHeightAtDistanceM,
  DRONE_TARGET_AGL_M,
  visibleDistanceGroundLevel,
} from '@/lib/map/terrain-masking'

let pass = 0
let fail = 0
function ck(label: string, ok: boolean) {
  if (ok) {
    pass++
    console.log(`✓ ${label}`)
  } else {
    fail++
    console.error(`✗ ${label}`)
  }
}

const h = 1000
const R = 5000
const step = 50
ck('dome zenith at center is emitter + radius', domeHeightAtDistanceM(h, R, 0) === h + R)
ck('dome at rim is emitter alt', domeHeightAtDistanceM(h, R, R) === h)
ck('dome at mid-radius', domeHeightAtDistanceM(h, R, 3000) === h + Math.sqrt(R * R - 3000 * 3000))

const emitter = 100
const flatTerrain = Array.from({ length: 20 }, () => 100)
ck(
  'flat terrain — full range visible',
  visibleDistanceGroundLevel(flatTerrain, step, emitter, 1000) === 1000,
)

const ridgeTerrain = flatTerrain.map((t, i) => {
  const d = (i + 1) * step
  if (d === 500) return 250
  return t
})
const visRidge = visibleDistanceGroundLevel(ridgeTerrain, step, emitter, 1000)
ck('ridge at 500m blocks beyond', visRidge <= 500 && visRidge >= 400)

const valleyEmitterTerrain = Array.from({ length: 40 }, (_, i) => {
  const d = (i + 1) * step
  if (d <= 400) return 80
  if (d <= 800) return 200
  return 80
})
const visValley = visibleDistanceGroundLevel(valleyEmitterTerrain, step, 82, 2000)
ck(
  'valley emitter — MEA uses drone AGL not dome',
  visValley < 2000 && visValley > 0,
)
ck('drone target AGL constant', DRONE_TARGET_AGL_M === 30)

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
