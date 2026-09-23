import { payloadsForPlatform } from '@/lib/a3dm/catalog'
import { bandsForPayload } from '@/data/a3dm/payload-bands'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { fmtNum } from '@/components/platforms/platform-display'
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
    <section id="payloads" className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">
          Compatible payloads <span className="font-normal store-text-muted">(A3DM)</span>
        </h2>
        <p className="text-[12px] font-mono tabular-nums store-text-muted">
          {platform.a3dm_drone_id ?? platform.id}
          {dry != null && ` · dry ${fmtNum(dry)} kg`}
          {mtow != null && ` · MTOW ${fmtNum(mtow)} kg`}
          {maxPay != null && ` · max payload ${fmtNum(maxPay)} kg`}
        </p>
      </div>
      <ScrollArea maxHeight="min(460px, calc(100vh - 200px))">
        <table className="dt compact">
          <caption className="sr-only">Compatible payloads</caption>
          <thead>
            <tr>
              <th scope="col">Payload</th>
              <th scope="col">Type</th>
              <th scope="col" className="text-right">
                Mass <span className="font-normal store-text-muted">g</span>
              </th>
              <th scope="col">Mount</th>
              <th scope="col">Spectrum Bands</th>
            </tr>
          </thead>
          <tbody>
            {payloads.map((p) => {
              const bands = p.spectrum_eligible ? bandsForPayload(p.id, p.type) : []
              const over =
                dry != null && p.weight_g != null && mtow != null ? dry + p.weight_g / 1000 > mtow : false
              return (
                <tr key={p.id}>
                  <td>
                    <span className="primary block">{p.name}</span>
                    <span className="meta font-mono">{p.id}</span>
                  </td>
                  <td>{p.type}</td>
                  <td className="num">
                    {p.weight_g != null ? (
                      <span className="text-[var(--store-ink)]">{fmtNum(p.weight_g)}</span>
                    ) : (
                      <span className="store-text-muted">—</span>
                    )}
                    {over ? <span className="tag amber ml-2">Exceeds MTOW</span> : null}
                  </td>
                  <td>{p.mount_type ?? <span className="store-text-muted">—</span>}</td>
                  <td>
                    {bands.length > 0 ? (
                      <span className="font-mono text-[12px] text-[#67E8F9]">
                        {bands.map((b) => b.label).join(' · ')}
                      </span>
                    ) : (
                      <span className="store-text-muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollArea>
    </section>
  )
}
