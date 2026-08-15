import { payloadsForPlatform } from '@/lib/a3dm/catalog'
import { bandsForPayload } from '@/data/a3dm/payload-bands'
import { StorePanel } from '@/components/ui/store-surface'
import type { Platform } from '@/lib/types'

interface PayloadCompatPanelProps {
  platform: Platform
}

export function PayloadCompatPanel({ platform }: PayloadCompatPanelProps) {
  const payloads = payloadsForPlatform(platform.id)
  if (payloads.length === 0) return null

  const dry = platform.dry_weight_kg
  const mtow = platform.mtow_kg
  const maxPay = platform.max_payload_kg

  return (
    <div id="payloads">
    <StorePanel className="p-4 space-y-3">
      <h2 className="font-semibold text-white">Compatible payloads (A3DM)</h2>
      <p className="text-xs store-text-muted font-mono">
        {platform.a3dm_drone_id ?? platform.id}
        {dry != null && ` · dry ${dry} kg`}
        {mtow != null && ` · MTOW ${mtow} kg`}
        {maxPay != null && ` · max payload ${maxPay} kg`}
      </p>
      <ul className="space-y-2">
        {payloads.map((p) => {
          const bands = p.spectrum_eligible ? bandsForPayload(p.id, p.type) : []
          const over =
            dry != null && p.weight_g != null && mtow != null
              ? dry + p.weight_g / 1000 > mtow
              : false
          return (
            <li key={p.id} className="border border-[var(--store-line)] rounded-lg p-2">
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-white">{p.name}</span>
                <span className="font-mono text-xs store-text-muted">{p.type}</span>
              </div>
              <p className="text-[11px] font-mono store-text-muted mt-0.5">
                {p.id}
                {p.weight_g != null && ` · ${p.weight_g} g`}
                {p.mount_type && ` · ${p.mount_type}`}
                {over && ' · exceeds MTOW'}
              </p>
              {bands.length > 0 && (
                <p className="text-[11px] font-mono text-cyan mt-1">
                  {bands.map((b) => b.label).join(' · ')}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </StorePanel>
    </div>
  )
}
