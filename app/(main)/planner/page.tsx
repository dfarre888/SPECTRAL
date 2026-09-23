import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { HubPageShell } from '@/components/hub/HubPageShell';
import { PLANNER_VIGNETTES, type PlannerVignette } from '@/lib/planner/vignettes';
import { PlannerLibraryClient } from '@/components/planner/PlannerLibraryClient';
import { DEMO_LAYDOWN, ThreatRoutePanel } from '@/components/planner/ThreatRoutePanel';

/**
 * Vignette names carry a qualifier after a dash ("Force — South China Sea",
 * "Taipan Strike 26 — GBAD CEA-SM-2"). Split it so the card reads as a title
 * plus a quiet line, instead of one long dashed string.
 */
function splitName(v: PlannerVignette): { kicker?: string; title: string; qualifier?: string } {
  const parts = v.name.split(/\s+[—–-]\s+/);
  if (parts.length < 2) return { title: v.name };
  const [head, ...rest] = parts;
  const tail = rest.join(', ');
  // A one-word head is a category ("Force"), so it reads as a kicker.
  if (!head.includes(' ')) return { kicker: head, title: tail };
  return { title: head, qualifier: tail };
}

function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="store-display text-[17px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">{title}</h2>
      {children ? <p className="mt-1 max-w-[80ch] text-[13px] leading-relaxed store-text-body">{children}</p> : null}
    </div>
  );
}

export default function PlannerPage() {
  return (
    <HubPageShell
      eyebrow="SPECTRAL Planner"
      title="Battlespace plan library"
      subtitle="Launch an OSINT vignette on Map Intel, check a route against the threat laydown, and reopen saved laydowns. Plans publish to WOPR and PCM from the Map Intel toolbar."
      headerAction={
        <p className="text-xs font-mono store-text-muted">
          Date of information: Jul 2026
        </p>
      }
    >
      <section>
        <SectionHead title="Vignettes">
          {PLANNER_VIGNETTES.length} OSINT vignettes. Each opens on Map Intel with its laydown and IADS stack preloaded.
        </SectionHead>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PLANNER_VIGNETTES.map((v) => {
            const n = splitName(v);
            return (
              <Link
                key={v.id}
                href={`/map?planVignette=${v.id}`}
                className="group store-panel flex flex-col gap-3 rounded-2xl p-5 transition-[border-color,box-shadow] duration-200 ease-out hover:border-[rgba(41,151,255,0.45)] hover:shadow-[0_0_0_1px_rgba(41,151,255,0.18),0_18px_40px_-24px_rgba(41,151,255,0.55)] motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {n.kicker ? <p className="mb-1 text-xs store-text-muted">{n.kicker}</p> : null}
                    <h3 className="store-display text-[15px] font-semibold leading-snug text-[var(--store-ink)]">
                      {n.title}
                    </h3>
                    {n.qualifier ? (
                      <p className="mt-1 font-mono text-xs store-text-muted">{n.qualifier}</p>
                    ) : null}
                  </div>
                  <ArrowUpRight
                    className="mt-0.5 h-4 w-4 shrink-0 store-text-muted transition-colors group-hover:text-[var(--wb-blue)]"
                    aria-hidden
                  />
                </div>
                <p className="text-[13px] leading-relaxed store-text-body">{v.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {v.swarmCount ? (
                    <span className="tag red font-mono">{v.swarmCount}× threat swarm preset</span>
                  ) : null}
                  {v.economicsHighlight ? (
                    <span className="tag">{v.economicsHighlight.label}</span>
                  ) : null}
                  <span className="ml-auto text-xs store-text-muted transition-colors group-hover:text-[var(--store-ink)]">
                    Open in Map Intel
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <SectionHead title="Threat-aware routing">
          A great-circle leg ignores what is looking at it. This plans the path that minimises cumulative
          exposure, bending around engagement envelopes and through the Doppler notch, and states plainly
          when no clear route exists inside the detour allowance.
        </SectionHead>
        <ThreatRoutePanel
          start={{ lon: 143.0, lat: -38.0 }}
          objective={{ lon: 156.0, lat: -31.0 }}
          placed={DEMO_LAYDOWN}
        />
      </section>

      <section className="mt-12">
        <SectionHead title="Saved plans">
          Laydowns saved from the Map Intel toolbar, most recently updated first.
        </SectionHead>
        <PlannerLibraryClient />
      </section>
    </HubPageShell>
  );
}
