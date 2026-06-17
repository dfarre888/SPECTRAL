import { Badge } from '@/components/ui/badge';
import type { SovereignPlatform } from '@/lib/platforms/sovereign-types';
import { SOVEREIGN_CORE_BOUNDARY } from '@/lib/platforms/sovereign-types';

const COUNTRY_FLAG: Record<SovereignPlatform['origin_country'], string> = {
  Australia: '🇦🇺',
  UK: '🇬🇧',
  USA: '🇺🇸',
};

const STATUS_LABEL: Record<SovereignPlatform['status'], string> = {
  in_service: 'In Service',
  in_development: 'In Development',
  trials: 'Trials',
  announced: 'Announced',
};

const ROLE_LABEL: Record<SovereignPlatform['role'], string> = {
  blue_force: 'Blue Force',
  blue_or_red: 'Blue / Red',
  enabler: 'Enabler',
};

export function SovereignPlatformCard({ platform }: { platform: SovereignPlatform }) {
  return (
    <article className="store-panel rounded-2xl p-5 flex flex-col gap-4 border border-[var(--store-line)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono store-text-muted uppercase tracking-wider">
            {COUNTRY_FLAG[platform.origin_country]} {platform.origin_country}
          </p>
          <h3 className="text-base font-semibold text-white mt-1">{platform.display_name}</h3>
          <p className="text-xs store-text-muted mt-1">{platform.sovereign_program}</p>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <Badge variant="outline" className="text-[10px] font-mono">
            {STATUS_LABEL[platform.status]}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono">
            {ROLE_LABEL[platform.role]}
          </Badge>
        </div>
      </div>
      <p className="text-sm store-text-body leading-relaxed">{platform.open_source_summary}</p>
      {platform.open_sources.length > 0 && (
        <ul className="text-[11px] font-mono store-text-muted space-y-1">
          {platform.open_sources.map((src) => (
            <li key={src}>· {src}</li>
          ))}
        </ul>
      )}
      <p className="text-[10px] font-mono store-text-muted border-t border-[var(--store-line)] pt-3 mt-auto">
        {SOVEREIGN_CORE_BOUNDARY}
      </p>
    </article>
  );
}
