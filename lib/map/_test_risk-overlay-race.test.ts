import { describe, expect, it, vi, beforeEach } from 'vitest'
import { syncRiskOverlayImpl, type RiskOverlaySyncContext } from '@/app/map/hooks/useRiskOverlayController'
import { WARHEAD_DB } from '@/lib/risk/warhead-db'
import type { RiskOverlayEntities } from '@/lib/map/risk-overlay'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'

const addBlastOverlayMock = vi.fn()
const addJammingOverlayMock = vi.fn()
const moveRiskOverlayMock = vi.fn()
const removeRiskOverlayMock = vi.fn()
const updateRiskOverlayOpacityMock = vi.fn()

vi.mock('@/lib/map/risk-overlay', () => ({
  addBlastOverlay: (...args: unknown[]) => addBlastOverlayMock(...args),
  addJammingOverlay: (...args: unknown[]) => addJammingOverlayMock(...args),
  moveRiskOverlay: (...args: unknown[]) => moveRiskOverlayMock(...args),
  removeRiskOverlay: (...args: unknown[]) => removeRiskOverlayMock(...args),
  updateRiskOverlayOpacity: (...args: unknown[]) => updateRiskOverlayOpacityMock(...args),
  RISK_ANCHOR_ID: 'spectral-risk-anchor',
}))

const mockViewer = { id: 'viewer' } as CesiumContext['viewer']
const mockCtx = { viewer: mockViewer } as CesiumContext

function makeSyncContext(overrides?: Partial<{
  lon: number | null
  lat: number | null
  overlay: RiskOverlayEntities | null
  gen: number
}>): RiskOverlaySyncContext {
  const cesiumCtxRef = { current: mockCtx }
  const riskOverlayRef = { current: overrides?.overlay ?? null }
  const riskOverlayGenRef = { current: overrides?.gen ?? 0 }
  const riskLonRef = { current: overrides?.lon ?? 55.0 }
  const riskLatRef = { current: overrides?.lat ?? 26.0 }
  const riskRingShadeRef = { current: 55 }
  return {
    cesiumCtxRef,
    riskOverlayRef,
    riskOverlayGenRef,
    riskLonRef,
    riskLatRef,
    riskRingShadeRef,
  }
}

const warheadA = WARHEAD_DB[0]!
const warheadB = WARHEAD_DB[1] ?? WARHEAD_DB[0]!

describe('risk overlay race condition — syncRiskOverlayImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addBlastOverlayMock.mockImplementation(async () => ({
      anchor: { id: 'spectral-risk-anchor' },
      rings: [{ id: 'ring-1', fill: [0, 0, 0, 0], outline: [0, 0, 0, 0] }],
    }))
    updateRiskOverlayOpacityMock.mockResolvedValue(undefined)
    moveRiskOverlayMock.mockResolvedValue(undefined)
  })

  it('rapid position ref updates call moveRiskOverlay without repeated addBlastOverlay', async () => {
    const ctx = makeSyncContext()
    await syncRiskOverlayImpl(ctx, 'blast', warheadA, null)
    expect(addBlastOverlayMock).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 10; i++) {
      ctx.riskLonRef.current = 55 + i * 0.01
      ctx.riskLatRef.current = 26 + i * 0.01
      await moveRiskOverlayMock(mockViewer, ctx.riskOverlayRef.current, ctx.riskLonRef.current, ctx.riskLatRef.current)
    }

    expect(moveRiskOverlayMock).toHaveBeenCalledTimes(10)
    expect(addBlastOverlayMock).toHaveBeenCalledTimes(1)
  })

  it('weapon change triggers a second addBlastOverlay rebuild at current ref position', async () => {
    const ctx = makeSyncContext()
    await syncRiskOverlayImpl(ctx, 'blast', warheadA, null)
    await syncRiskOverlayImpl(ctx, 'blast', warheadB, null)
    expect(addBlastOverlayMock).toHaveBeenCalledTimes(2)
    expect(addBlastOverlayMock.mock.calls[1]?.[1]).toBe(55.0)
    expect(addBlastOverlayMock.mock.calls[1]?.[2]).toBe(26.0)
  })

  it('generation token discards stale overlay when a newer sync completes first', async () => {
    let resolveFirst: ((value: RiskOverlayEntities) => void) | undefined
    const staleOverlay: RiskOverlayEntities = {
      anchor: { id: 'stale-anchor' },
      rings: [{ id: 'stale-ring', fill: [0, 0, 0, 0], outline: [0, 0, 0, 0] }],
    }
    const freshOverlay: RiskOverlayEntities = {
      anchor: { id: 'fresh-anchor' },
      rings: [{ id: 'fresh-ring', fill: [0, 0, 0, 0], outline: [0, 0, 0, 0] }],
    }

    addBlastOverlayMock
      .mockImplementationOnce(
        () =>
          new Promise<RiskOverlayEntities>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(async () => freshOverlay)

    const ctx = makeSyncContext()
    const first = syncRiskOverlayImpl(ctx, 'blast', warheadA, null)
    const second = syncRiskOverlayImpl(ctx, 'blast', warheadB, null)

    await second
    resolveFirst?.(staleOverlay)
    await first

    expect(removeRiskOverlayMock).toHaveBeenCalledWith(mockViewer, staleOverlay)
    expect(ctx.riskOverlayRef.current).toEqual(freshOverlay)
  })

  it('reads position from refs so lon/lat state changes alone do not require resync', async () => {
    const ctx = makeSyncContext({ lon: 55.1, lat: 26.2 })
    await syncRiskOverlayImpl(ctx, 'blast', warheadA, null)
    expect(addBlastOverlayMock.mock.calls[0]?.[1]).toBe(55.1)
    expect(addBlastOverlayMock.mock.calls[0]?.[2]).toBe(26.2)

    ctx.riskLonRef.current = 55.9
    ctx.riskLatRef.current = 26.8
    await moveRiskOverlayMock(mockViewer, ctx.riskOverlayRef.current, 55.9, 26.8)
    expect(addBlastOverlayMock).toHaveBeenCalledTimes(1)
    expect(moveRiskOverlayMock).toHaveBeenCalledTimes(1)
  })
})
