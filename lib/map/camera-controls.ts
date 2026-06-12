import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'

const ROTATE_RAD = 0.04
const ZOOM_FACTOR = 0.15
const TILT_RAD = 0.03

export const CAMERA_MIN_DISTANCE_M = 200
export const CAMERA_MAX_DISTANCE_M = 5_000_000

const zoomScratch = {
  ray: null as unknown,
  v0: null as unknown,
  v2: null as unknown,
}

function ensureZoomScratch(Cesium: CesiumModule) {
  if (!zoomScratch.ray) {
    zoomScratch.ray = new Cesium.Ray(new Cesium.Cartesian3(), new Cesium.Cartesian3())
    zoomScratch.v0 = new Cesium.Cartesian3()
    zoomScratch.v2 = new Cesium.Cartesian3()
  }
  return zoomScratch as {
    ray: InstanceType<CesiumModule['Ray']>
    v0: InstanceType<CesiumModule['Cartesian3']>
    v2: InstanceType<CesiumModule['Cartesian3']>
  }
}

export function panCamera(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  direction: 'north' | 'south' | 'east' | 'west'
) {
  const camera = viewer.camera
  switch (direction) {
    case 'north':
      camera.rotateUp(TILT_RAD)
      break
    case 'south':
      camera.rotateDown(TILT_RAD)
      break
    case 'east':
      camera.rotateRight(ROTATE_RAD)
      break
    case 'west':
      camera.rotateLeft(ROTATE_RAD)
      break
  }
}

export function tiltCamera(viewer: CesiumViewer, direction: 'up' | 'down') {
  const camera = viewer.camera
  if (direction === 'up') camera.lookUp(TILT_RAD)
  else camera.lookDown(TILT_RAD)
}

export function zoomCamera(viewer: CesiumViewer, direction: 'in' | 'out') {
  const camera = viewer.camera
  if (direction === 'in') camera.zoomIn(ZOOM_FACTOR)
  else camera.zoomOut(ZOOM_FACTOR)
}

/** Set heading absolutely (degrees). 0 = north, 90 = east. */
export function setCameraHeading(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  deg: number
) {
  if (viewer.isDestroyed?.()) return
  const cam = viewer.camera
  const dest = Cesium.Cartesian3.clone(cam.positionWC)
  cam.setView({
    destination: dest,
    orientation: {
      heading: Cesium.Math.toRadians(deg),
      pitch: cam.pitch ?? Cesium.Math.toRadians(-45),
      roll: cam.roll ?? 0,
    },
  })
}

/** Adjust pitch by delta degrees. Clamped -90 (top-down) to 0 (horizontal). */
export function tiltCameraByDelta(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  deltaDeg: number
) {
  if (viewer.isDestroyed?.()) return
  const cam = viewer.camera
  const currentPitchDeg = Cesium.Math.toDegrees(cam.pitch ?? Cesium.Math.toRadians(-45))
  const newPitchDeg = Math.max(-90, Math.min(0, currentPitchDeg + deltaDeg))
  const dest = Cesium.Cartesian3.clone(cam.positionWC)
  cam.setView({
    destination: dest,
    orientation: {
      heading: cam.heading ?? 0,
      pitch: Cesium.Math.toRadians(newPitchDeg),
      roll: cam.roll ?? 0,
    },
  })
}

/** Slider 0..100 → distance in metres (log scale). */
export function sliderToDistance(value: number): number {
  const t = Math.max(0, Math.min(100, value)) / 100
  return CAMERA_MIN_DISTANCE_M * Math.pow(CAMERA_MAX_DISTANCE_M / CAMERA_MIN_DISTANCE_M, t)
}

export function distanceToSlider(distance: number): number {
  const d = Math.max(CAMERA_MIN_DISTANCE_M, Math.min(CAMERA_MAX_DISTANCE_M, distance))
  return (
    (100 * (Math.log(d) - Math.log(CAMERA_MIN_DISTANCE_M))) /
    (Math.log(CAMERA_MAX_DISTANCE_M) - Math.log(CAMERA_MIN_DISTANCE_M))
  )
}

function pickLookAtTarget(Cesium: CesiumModule, viewer: CesiumViewer) {
  const cam = viewer.camera
  const scene = viewer.scene
  const globe = scene.globe
  const s = ensureZoomScratch(Cesium)
  Cesium.Cartesian3.clone(cam.positionWC, s.ray.origin)
  Cesium.Cartesian3.clone(cam.direction, s.ray.direction)

  let target = globe.pick(s.ray, scene, s.v0)
  if (!target) {
    const interval = Cesium.IntersectionTests.rayEllipsoid(s.ray, globe.ellipsoid)
    if (interval && interval.start >= 0) {
      target = Cesium.Ray.getPoint(s.ray, interval.start, s.v0)
    }
  }
  return target
}

/** Distance from camera to terrain/ellipsoid point under crosshair. */
export function getCameraDistanceToTarget(
  Cesium: CesiumModule,
  viewer: CesiumViewer
): number | null {
  if (viewer.isDestroyed?.()) return null
  const target = pickLookAtTarget(Cesium, viewer)
  if (!target) return null
  return Cesium.Cartesian3.distance(viewer.camera.positionWC, target)
}

/** Move camera to `distanceM` from look-at target along view direction. */
export function setCameraDistanceFromTarget(
  Cesium: CesiumModule,
  viewer: CesiumViewer,
  distanceM: number
) {
  if (viewer.isDestroyed?.()) return
  const cam = viewer.camera
  const target = pickLookAtTarget(Cesium, viewer)
  const s = ensureZoomScratch(Cesium)

  if (target) {
    const dist = Math.max(CAMERA_MIN_DISTANCE_M, Math.min(CAMERA_MAX_DISTANCE_M, distanceM))
    const newPosition = Cesium.Cartesian3.add(
      target,
      Cesium.Cartesian3.multiplyByScalar(cam.direction, -dist, s.v2),
      s.v2
    )
    cam.setView({
      destination: newPosition,
      orientation: {
        heading: cam.heading ?? 0,
        pitch: cam.pitch ?? Cesium.Math.toRadians(-45),
        roll: cam.roll ?? 0,
      },
    })
    return
  }

  const step = Math.max(200, Math.min(5000, Math.abs(distanceM - 5000) * 0.1))
  if (distanceM < 5000) cam.moveForward(step)
  else cam.moveBackward(step)
}

export function resetCameraAustralia(Cesium: CesiumModule, viewer: CesiumViewer) {
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(134, -25, 2_000_000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  })
}
