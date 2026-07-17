'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DashboardCopy } from '@/lib/dashboard/adapters'
import type { BuiltDashboardData } from '@/lib/dashboard/build-live-data'
import { readLaydownSession, type LaydownSession } from '@/lib/map/laydown-session'
import {
  mergeLaydownSessionHint,
  resolveDefaultAssetId,
  writeDashboardSelectedAssetId,
} from '@/lib/dashboard/laydown-bridge'
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard'

/** Caller: app/(main)/page.tsx via DashboardHomeTabs — merges live API + sessionStorage laydown. */
interface DashboardCommandCenterProps extends BuiltDashboardData {
  copy: DashboardCopy
}

export function DashboardCommandCenter(props: DashboardCommandCenterProps) {
  const { copy, metrics, operators, assets: serverAssets, mapContext, recentPlanId, mapCenter } = props
  const searchParams = useSearchParams()
  const urlAsset = searchParams.get('asset')

  const [session, setSession] = useState<LaydownSession | null>(null)
  useEffect(() => {
    setSession(readLaydownSession())
  }, [])

  const assets = useMemo(
    () => mergeLaydownSessionHint(serverAssets, session),
    [serverAssets, session],
  )

  const resolvedDefault = useMemo(
    () => resolveDefaultAssetId(assets, session, urlAsset),
    [assets, session, urlAsset],
  )

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (resolvedDefault) setSelectedId(resolvedDefault)
  }, [resolvedDefault])

  const handleSelectAsset = useCallback((id: string) => {
    setSelectedId(id)
    writeDashboardSelectedAssetId(id)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('asset', id)
      window.history.replaceState(null, '', url.toString())
    }
  }, [])

  return (
    <OverviewDashboard
      copy={copy}
      metrics={metrics}
      operators={operators}
      assets={assets}
      mapContext={mapContext}
      selectedAssetId={selectedId}
      onSelectAsset={handleSelectAsset}
      recentPlanId={recentPlanId}
      mapCenter={mapCenter}
    />
  )
}
