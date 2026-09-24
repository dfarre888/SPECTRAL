'use client'

import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import type { GnssJammer } from '@/lib/gnss/queries'

const TIER_LABEL: Record<string, string> = {
  tier_1: 'Tier 1',
  tier_2: 'Tier 2',
  tier_3: 'Tier 3',
  military: 'Military',
  commercial: 'Commercial',
}

const COLUMNS: DataColumn<GnssJammer>[] = [
  {
    key: 'name',
    header: 'Jammer',
    sticky: true,
    width: 300,
    sortValue: (j) => j.name,
    cell: (j) => <span className="primary">{j.name}</span>,
  },
  { key: 'country', header: 'Origin', width: 140, sortValue: (j) => j.country, cell: (j) => j.country ?? '—' },
  {
    key: 'tier',
    header: 'Tier',
    width: 110,
    sortValue: (j) => j.jammer_tier,
    cell: (j) => (j.jammer_tier ? TIER_LABEL[j.jammer_tier] ?? j.jammer_tier.replace(/_/g, ' ') : '—'),
  },
  {
    key: 'bands',
    header: 'Bands jammed',
    sortValue: (j) => j.freq_summary,
    cell: (j) => <span className="mono" title={j.freq_summary ?? undefined}>{j.freq_summary ?? 'Not published'}</span>,
  },
  {
    key: 'radius',
    header: 'Radius km',
    align: 'right',
    width: 110,
    sortValue: (j) => j.effective_radius_km,
    cell: (j) => (j.effective_radius_km != null ? j.effective_radius_km.toLocaleString('en-AU') : '—'),
  },
  {
    key: 'spoof',
    header: 'Spoofing',
    width: 120,
    sortValue: (j) => (j.spoofing_capable ? 1 : 0),
    cell: (j) =>
      j.spoofing_capable == null ? '—' : j.spoofing_capable ? <span className="tag amber">Can spoof</span> : <span className="tag">Jam only</span>,
  },
]

/** GNSS jammers on record: the systems behind the interference on the other tabs. */
export function GnssJammersTable({ jammers }: { jammers: GnssJammer[] }) {
  return (
    <section aria-label="GNSS jammers">
      <p className="text-[13px] store-text-body mb-3 max-w-[80ch]">
        Systems known to jam or spoof satellite navigation, from open sources. Blank figures are not published; nothing is
        estimated to fill a cell.
      </p>
      <DataTable
        rows={jammers}
        columns={COLUMNS}
        rowKey={(j) => j.id}
        defaultSort={{ key: 'name', dir: 'asc' }}
        maxHeight="calc(100vh - 320px)"
        empty="No GNSS jammers on record in this database."
        caption="GNSS jammers"
      />
    </section>
  )
}
