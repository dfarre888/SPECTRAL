import type { SovereignPlatform } from '@/lib/platforms/sovereign-types';
import { SOVEREIGN_CORE_BOUNDARY } from '@/lib/platforms/sovereign-types';

const COUNTRY_FLAG: Record<SovereignPlatform['origin_country'], string> = {
  Australia: '🇦🇺',
  UK: '🇬🇧',
  USA: '🇺🇸',
};

const STATUS_LABEL: Record<SovereignPlatform['status'], string> = {
  in_service: 'In service',
  in_development: 'In development',
  trials: 'Trials',
  announced: 'Announced',
};

/** Status is a `.tag`: in service reads as nominal, trials as caution. */
const STATUS_TONE: Record<SovereignPlatform['status'], string> = {
  in_service: 'green',
  in_development: '',
  trials: 'amber',
  announced: '',
};

const ROLE_LABEL: Record<SovereignPlatform['role'], string> = {
  blue_force: 'Blue force',
  blue_or_red: 'Blue or Red',
  enabler: 'Enabler',
};

export function SovereignPlatformCard({ platform }: { platform: SovereignPlatform }) {
  return (
    <article className="store-panel rounded-2xl p-5 flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] store-text-muted">
            <span aria-hidden className="mr-1">
              {COUNTRY_FLAG[platform.origin_country]}
            </span>
            {platform.origin_country}
          </p>
          <h3 className="text-[16px] font-semibold leading-snug text-[var(--store-ink)] mt-1">{platform.display_name}</h3>
          <p className="text-[12px] store-text-muted mt-1">{platform.sovereign_program}</p>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0">
          <span className={`tag ${STATUS_TONE[platform.status]}`}>{STATUS_LABEL[platform.status]}</span>
          <span className={`tag ${platform.role === 'blue_force' ? 'blue' : ''}`}>{ROLE_LABEL[platform.role]}</span>
        </div>
      </div>
      <p className="text-[13px] store-text-body leading-relaxed">{platform.open_source_summary}</p>
      {platform.open_sources.length > 0 && (
        <ul className="text-[11.5px] store-text-muted space-y-1">
          {platform.open_sources.map((src) => (
            <li key={src} className="break-words">
              {src}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11.5px] leading-relaxed store-text-muted border-t border-[var(--store-line)] pt-3 mt-auto">
        {SOVEREIGN_CORE_BOUNDARY}
      </p>
    </article>
  );
}
