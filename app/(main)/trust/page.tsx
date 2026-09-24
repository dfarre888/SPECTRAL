/**
 * Trust & Assurance.
 *
 * Every statement on this page is computed from this instance's code, data or
 * configuration at request time, or states plainly that it depends on the
 * customer's hosting. Accreditations (IRAP, DISP, ISO) are not claimed.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { intelAge, type Freshness } from '@/lib/conflicts/intel-bundle'
import { scanBundles } from '@/lib/conflicts/latest-bundle'
import { WATCHFLOOR_NAME } from '@/lib/intel/watchfloor'
import { ADVICE_ONLY, OFFLINE_ENGINE } from '@/lib/spectrum/aerocopilot-engine'
import { bedrockCredentialsPresent, BEDROCK_REGION, resolveAiMode } from '@/lib/spectrum/aerocopilot-mode'
import { fetchRecentAiAudit } from '@/lib/trust/ai-audit'
import { formatKeyId } from '@/lib/trust/bundle-signature'
import { publicKeyPath } from '@/lib/trust/intel-keys'
import { fetchProvenance, tallyGrades, type GradeCount } from '@/lib/trust/provenance'
import { scanReporting } from '@/lib/trust/reporting-scan'
import { TELEMETRY_SIGNATURES } from '@/lib/trust/telemetry-check'
import { Code, Mono, Note, Section, SignatureTag, Status, SubHead, Table, utc } from '@/components/trust/TrustParts'

export const dynamic = 'force-dynamic'

const NAV = [
  ['provenance', 'Provenance'],
  ['watchfloor', WATCHFLOOR_NAME],
  ['crypto', 'Cryptography'],
  ['ai', 'AI use'],
  ['sovereignty', 'Sovereignty'],
] as const

const STRONG = new Set(['Confirmed', 'High'])
const WEAK = new Set(['Estimated', 'Possible', 'Unconfirmed', 'Reported', 'Low', 'Ungraded'])
const AGE_TONE: Record<Freshness, string> = { current: 'green', aging: 'amber', stale: 'amber', expired: 'red' }
const ageText = (days: number) => (days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'} old`)

function Grades({ grades }: { grades: GradeCount[] }) {
  if (grades.length === 0) return <span className="store-text-muted">none</span>
  return (
    <span className="flex flex-wrap gap-1.5">
      {grades.map((g) => (
        <span key={g.grade} className={`tag ${STRONG.has(g.grade) ? 'green' : WEAK.has(g.grade) ? 'amber' : ''}`}>
          {g.grade}
          <b className="font-mono font-medium tabular-nums">{g.count}</b>
        </span>
      ))}
    </span>
  )
}

function fontFiles(): string[] {
  try {
    return readdirSync(join(process.cwd(), 'public', 'fonts')).filter((f) => f.endsWith('.woff2'))
  } catch {
    return []
  }
}

const envSet = (name: string) => Boolean(process.env[name]?.trim())

function Unavailable() {
  return <span className="text-[15px] font-normal tracking-normal store-text-muted">Not available</span>
}

const right = (label: string) => (
  <span key={label} className="block text-right">
    {label}
  </span>
)

export default async function TrustPage() {
  const [prov, audit] = await Promise.all([fetchProvenance(), fetchRecentAiAudit(8)])
  const bundles = scanBundles()
  const reporting = scanReporting()
  const mode = resolveAiMode()
  const creds = bedrockCredentialsPresent()
  const fonts = fontFiles()
  const schedule = process.env.SPECTRAL_INTEL_SCHEDULE?.trim().replace(/^"|"$/g, '')

  const latest = bundles.latest
  const rep = reporting.latest
  const age = latest ? intelAge(latest.bundle.manifest.generatedAt) : null
  const repAge = rep ? intelAge(rep.generatedAt) : null
  const leadGrades = latest ? tallyGrades(latest.bundle.incidents.map((i) => i.confidence)) : []
  const leadUncited = latest ? latest.bundle.incidents.filter((i) => !i.source_ref).length : 0
  const dbRecords = prov.datasets.reduce((n, d) => n + (d.total ?? 0), 0)
  const dbAvailable = prov.datasets.some((d) => d.total != null)
  const rejected = [
    ...bundles.rejected.map((r) => ({ ...r, stream: 'Incident bundle' })),
    ...reporting.rejected.map((r) => ({ ...r, stream: 'Reporting window' })),
  ]
  const pubRel = publicKeyPath().replace(`${process.cwd()}/`, '')
  const sigState = latest?.signature.state
  const sigLabel = !latest ? 'None' : sigState === 'verified' ? 'Verified' : sigState === 'unsigned' ? 'Unsigned' : 'Not checked'

  const outbound: { service: string; use: string; from: string; state: 'required' | 'yes' | 'no' | 'on-request'; note?: string }[] = [
    { service: 'Database (Supabase or customer Postgres)', use: 'All records and the AI audit log', from: 'Server', state: envSet('NEXT_PUBLIC_SUPABASE_URL') ? 'required' : 'no' },
    {
      service: `AWS Bedrock (${BEDROCK_REGION}, Sydney)`,
      use: 'Model answers: AeroCopilot in Bedrock mode, PCM scenario titles, referee narration',
      from: 'Server',
      state: creds ? 'yes' : 'no',
      note: creds ? (mode.engine.engine === 'bedrock' ? 'AeroCopilot uses it' : 'AeroCopilot stays offline') : undefined,
    },
    { service: 'Cesium ion', use: '3D globe terrain and imagery', from: 'Browser', state: envSet('NEXT_PUBLIC_CESIUM_ION_TOKEN') ? 'yes' : 'no' },
    { service: 'AIS provider', use: 'Vessel positions', from: 'Server', state: envSet('AIS_API_KEY') ? 'yes' : 'no' },
    { service: 'Windy', use: 'Weather at a point', from: 'Server', state: envSet('WINDY_API_KEY') ? 'yes' : 'no' },
    { service: 'OpenStreetMap Overpass', use: 'Building footprints, when an administrator runs an import', from: 'Server', state: 'on-request' },
  ]

  return (
    <div className="max-w-[76rem] mx-auto">
      <header>
        <h1 className="page-title m-0">Trust &amp; Assurance</h1>
        <p className="page-lede">
          Where the data comes from, how updates are signed, how the AI is used and what leaves this instance. Each
          line is read from this instance&apos;s code, data or configuration; anything that depends on your hosting
          says so. No accreditation is claimed here.
        </p>
      </header>

      <div className="fc-inst mt-7 border-y fc-hair" role="list" aria-label="Summary">
        <div role="listitem">
          <div className="k">OSINT records</div>
          <div className="v">{dbAvailable ? dbRecords.toLocaleString('en-AU') : <Unavailable />}</div>
          <div className="d">{dbAvailable ? 'Platforms, counter-UAS, curated incidents' : 'Database not available'}</div>
        </div>
        <div role="listitem">
          <div className="k">{WATCHFLOOR_NAME} signature</div>
          <div className="v">{sigLabel}</div>
          <div className="d">
            {latest?.signature.keyId ? `ML-DSA-87, key ${formatKeyId(latest.signature.keyId).slice(0, 9)}` : 'ML-DSA-87'}
          </div>
        </div>
        <div role="listitem">
          <div className="k">Newest bundle</div>
          <div className="v">
            {age ? (
              <>
                {age.ageDays}
                <small>{age.ageDays === 1 ? 'day old' : 'days old'}</small>
              </>
            ) : (
              <Unavailable />
            )}
          </div>
          <div className="d">
            {latest
              ? `${latest.bundle.manifest.generatedAt.slice(0, 10)}, ${latest.bundle.manifest.incidentCount} incidents`
              : 'None on this instance'}
          </div>
        </div>
        <div role="listitem">
          <div className="k">AI engine</div>
          <div className="v">{mode.engine.engine === 'offline' ? 'Offline' : 'Bedrock'}</div>
          <div className="d">{mode.engine.engine === 'offline' ? 'No model calls' : 'Claude, Sydney endpoint'}</div>
        </div>
        <div role="listitem">
          <div className="k">AI answers logged</div>
          <div className="v">{audit.total ?? 0}</div>
          <div className="d">
            {audit.store === 'database' ? 'In the database' : audit.store === 'local' ? 'In a local file' : 'None yet'}
          </div>
        </div>
      </div>

      <nav aria-label="Sections" className="seg sm mt-6 w-fit max-w-full overflow-x-auto">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      {/* Provenance ------------------------------------------------------ */}
      <Section
        id="provenance"
        title="Data provenance"
        lede={
          <>
            Every record comes from open sources. No classified or export-controlled material is held. Counts are
            read now from the database this instance is connected to
            {prov.osintPlatforms ? (
              <>
                ; <Mono>{prov.osintPlatforms.osint}</Mono> of <Mono>{prov.osintPlatforms.total}</Mono> platform records
                are marked <Code>source = osint</Code>.
              </>
            ) : (
              '.'
            )}
          </>
        }
      >
        <Table head={['Dataset', right('Records'), 'Confidence grades', right('No citation')]} caption="Records by confidence grade">
          {prov.datasets.map((d) => (
            <tr key={d.id}>
              <td>
                <span className="primary">{d.label}</span>
                <span className="meta font-mono">{d.table}</span>
              </td>
              <td className="num">
                {d.total == null ? (
                  <span className="store-text-muted font-sans" title={d.error ?? undefined}>
                    not available
                  </span>
                ) : (
                  d.total
                )}
              </td>
              <td>{d.total == null ? <span className="store-text-muted">not available</span> : <Grades grades={d.grades} />}</td>
              <td className="num">{d.total == null ? '' : d.uncited}</td>
            </tr>
          ))}
          <tr>
            <td>
              <span className="primary">{WATCHFLOOR_NAME} incident leads</span>
              <span className="meta font-mono">{latest ? `bundle ${latest.file}` : 'no bundle'}</span>
            </td>
            <td className="num">{latest ? latest.bundle.incidents.length : 0}</td>
            <td>
              <Grades grades={leadGrades} />
            </td>
            <td className="num">{leadUncited}</td>
          </tr>
        </Table>
        <Note>
          Grades are stored with each record. {WATCHFLOOR_NAME} leads are graded by how many independent outlets
          carried the event and are never promoted to confirmed automatically.
        </Note>

        <SubHead>Citations by source type</SubHead>
        {prov.totalCitations > 0 ? (
          <Table head={['Source type', right('Citations'), right('Share'), 'Example']} caption="Citations by source type">
            {prov.sourceTypes.map((s) => (
              <tr key={s.id}>
                <td className="primary whitespace-nowrap">{s.label}</td>
                <td className="num">{s.count}</td>
                <td className="num">{Math.round((s.count / prov.totalCitations) * 100)}%</td>
                <td className="clip w-[50%]" title={s.example ?? undefined}>
                  {s.example}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-[13px] store-text-muted m-0">Citations not available: the database did not answer.</p>
        )}
        <Note>
          {prov.totalCitations > 0 ? `${prov.totalCitations.toLocaleString('en-AU')} citations across the three datasets. ` : ''}
          Source type is inferred from each citation&apos;s text by the keyword rules in{' '}
          <Code>lib/trust/source-types.ts</Code>. The first matching rule wins and anything unmatched counts as Other.
          It is a sorting aid, not a manual review.
        </Note>
      </Section>

      {/* Watchfloor -------------------------------------------------------- */}
      <Section
        id="watchfloor"
        title={WATCHFLOOR_NAME}
        lede="Reporting reaches this instance as files built on a connected machine and carried in. Nothing on the instance reaches out for it. Each file is checked against the public key before it is shown; a file that fails is not shown and is listed here."
      >
        <Table head={['Stream', 'Newest file', 'Generated', 'Age', 'Contents', 'Signature']} caption={`${WATCHFLOOR_NAME} streams`}>
          <tr>
            <td className="primary whitespace-nowrap">Incident bundle</td>
            <td className="mono">{latest ? latest.file : 'none'}</td>
            <td className="mono whitespace-nowrap">{latest ? utc(latest.bundle.manifest.generatedAt) : ''}</td>
            <td>{age ? <span className={`tag ${AGE_TONE[age.freshness]}`}>{ageText(age.ageDays)}</span> : null}</td>
            <td>
              {latest ? (
                <>
                  <Mono>{latest.bundle.manifest.incidentCount}</Mono> incidents
                  <span className="meta font-mono">
                    {latest.bundle.manifest.coverageFrom?.slice(0, 10)} to {latest.bundle.manifest.coverageTo?.slice(0, 10)}
                  </span>
                </>
              ) : (
                <span className="store-text-muted">No bundle on this instance</span>
              )}
            </td>
            <td>
              {latest ? (
                <>
                  <SignatureTag state={latest.signature.state} title={latest.signature.reason} />
                  {latest.signature.signedAt ? <span className="meta font-mono">{utc(latest.signature.signedAt)}</span> : null}
                </>
              ) : null}
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Reporting window</td>
            <td className="mono">{rep ? rep.file : 'none'}</td>
            <td className="mono whitespace-nowrap">{rep ? utc(rep.generatedAt) : ''}</td>
            <td>{repAge ? <span className={`tag ${AGE_TONE[repAge.freshness]}`}>{ageText(repAge.ageDays)}</span> : null}</td>
            <td>
              {rep ? (
                <>
                  <Mono>{rep.items.length}</Mono> items from <Mono>{rep.sources.length}</Mono> sources
                  <span className="meta">{rep.windowDays}-day window</span>
                </>
              ) : (
                <span className="store-text-muted">No reporting file on this instance</span>
              )}
            </td>
            <td>
              {rep ? (
                <>
                  <SignatureTag state={rep.signature.state} title={rep.signature.reason} />
                  {rep.signature.signedAt ? <span className="meta font-mono">{utc(rep.signature.signedAt)}</span> : null}
                </>
              ) : null}
            </td>
          </tr>
        </Table>

        {rejected.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2" role="alert">
            {rejected.map((r) => (
              <p key={`${r.stream}-${r.file}`} className="text-[12.5px] m-0 flex flex-wrap items-center gap-2">
                <span className="tag red">Rejected</span>
                <span className="font-mono">{r.file}</span>
                <span className="store-text-body">
                  {r.stream}: {r.message}
                </span>
              </p>
            ))}
          </div>
        ) : null}

        <dl className="mt-6 grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-[12rem_1fr]">
          <dt className="store-text-muted">Trusted public key</dt>
          <dd className="m-0 store-text-body">
            {bundles.publicKey ? (
              <>
                ML-DSA-87, key id <Mono>{formatKeyId(bundles.publicKey.keyId)}</Mono>
                <span className="block text-[12px] store-text-muted mt-0.5">
                  SHA-384 fingerprint{' '}
                  <Mono title={bundles.publicKey.fingerprint}>{formatKeyId(bundles.publicKey.fingerprint.slice(0, 32))} …</Mono> in{' '}
                  <Code>{pubRel}</Code>
                </span>
              </>
            ) : (
              <>
                None configured, so signatures cannot be checked (<Code>{pubRel}</Code> is missing).
              </>
            )}
          </dd>
          <dt className="store-text-muted">Signature scheme</dt>
          <dd className="m-0 store-text-body">
            SHA-384 over the whole file in canonical JSON, signed with ML-DSA-87 (FIPS 204). It covers every stream in the
            file, including the attribution. See <Code>lib/trust/bundle-signature.ts</Code>.
          </dd>
          <dt className="store-text-muted">Unsigned files</dt>
          <dd className="m-0 store-text-body">
            {bundles.requireSigned ? (
              <>Rejected (<Code>SPECTRAL_INTEL_REQUIRE_SIGNED=true</Code>).</>
            ) : (
              <>
                Shown and labelled Unsigned. Set <Code>SPECTRAL_INTEL_REQUIRE_SIGNED=true</Code> to reject them.
              </>
            )}
          </dd>
          <dt className="store-text-muted">Update cycle</dt>
          <dd className="m-0 store-text-body">
            {schedule ? (
              schedule
            ) : (
              <>
                Manual: run <Code>npm run intel:bundle</Code> on a connected machine.
              </>
            )}
          </dd>
          <dt className="store-text-muted">Check before import</dt>
          <dd className="m-0 store-text-body">
            <Code>npm run intel:verify</Code> on the instance. It needs only the public key.
          </dd>
        </dl>

        <SubHead>Attribution</SubHead>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[12px] store-text-muted m-0 mb-2">Incident bundle, {latest?.attribution.length ?? 0} sources</p>
            <div className="flex flex-wrap gap-1.5">
              {(latest?.attribution ?? []).map((a) => (
                <span key={a} className="tag">
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] store-text-muted m-0 mb-2">Reporting window, {rep?.sources.length ?? 0} sources</p>
            <div className="flex flex-wrap gap-1.5">
              {(rep?.sources ?? []).map((a) => (
                <span key={a} className="tag">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
        <Note>As carried in each file. Headlines and links only; article text stays with the publisher.</Note>
      </Section>

      {/* Cryptography ------------------------------------------------------ */}
      <Section
        id="crypto"
        title="Cryptography against ISM-1917"
        lede="ISM-1917 (September 2026) asks that new cryptographic equipment, applications and libraries support ML-DSA-87, ML-KEM-1024, SHA-384 or SHA-512 and AES-256 by 2030. This is what SPECTRAL does itself, and what it leaves to the hosting."
      >
        <Table head={['Use', 'SPECTRAL today', 'ISM-1917 target', 'Status']} caption="Cryptography against ISM-1917">
          <tr>
            <td className="primary">{WATCHFLOOR_NAME} file signatures</td>
            <td>
              ML-DSA-87, FIPS 204 pure mode
              <span className="meta font-mono">@noble/post-quantum 0.7.1, pinned</span>
            </td>
            <td>ML-DSA-87</td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary">Signed digest</td>
            <td>SHA-384 over the canonical file</td>
            <td>SHA-384 or SHA-512</td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary">Counter-UXS evidence log</td>
            <td>
              SHA-384 record hashes, each version chained to the one before
              <span className="meta font-mono">lib/base-protection/evidence-hash.ts</span>
            </td>
            <td>SHA-384 or SHA-512</td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary">AI audit, local file chain</td>
            <td>SHA-384 of the previous line</td>
            <td>SHA-384 or SHA-512</td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary">AI audit, answer fingerprint</td>
            <td>SHA-256 of the answer text. It identifies an answer; nothing is signed with it.</td>
            <td>SHA-384 or SHA-512</td>
            <td>
              <Status kind="gap" />
            </td>
          </tr>
          <tr>
            <td className="primary">Bundle transit checksum</td>
            <td>FNV-1a 64-bit. Catches media corruption only.</td>
            <td>Not applicable</td>
            <td>
              <Status kind="info" />
            </td>
          </tr>
          <tr>
            <td className="primary">Signing key storage</td>
            <td>32-byte seed in a mode 600 file outside the repository on the connected machine. No hardware security module.</td>
            <td>Customer key management</td>
            <td>
              <Status kind="confirm" />
            </td>
          </tr>
          <tr>
            <td className="primary">Data in transit</td>
            <td>TLS is terminated by the hosting. SPECTRAL does not choose the cipher suites.</td>
            <td>ML-KEM-1024 key exchange, AES-256</td>
            <td>
              <Status kind="hosting" />
            </td>
          </tr>
          <tr>
            <td className="primary">Data at rest</td>
            <td>Encrypted by the database host.</td>
            <td>AES-256</td>
            <td>
              <Status kind="hosting" />
            </td>
          </tr>
          <tr>
            <td className="primary">Sign-in tokens</td>
            <td>Issued by Supabase Auth or the configured OIDC provider.</td>
            <td>ML-DSA-87</td>
            <td>
              <Status kind="hosting" />
            </td>
          </tr>
        </Table>
        <Note>
          SPECTRAL&apos;s own code uses no RSA, ECDSA or Diffie-Hellman. The classical algorithms that remain sit in TLS
          and sign-in, which the hosting provides.
        </Note>
      </Section>

      {/* AI use ------------------------------------------------------------ */}
      <Section
        id="ai"
        title="AI use"
        lede="Measured against Defence's Policy Settings for Responsible Use of AI (March 2026): a person stays accountable, answers can be traced to their sources, and use is recorded."
      >
        <Table head={['Setting', 'What SPECTRAL does', 'Status']} caption="AI use">
          <tr>
            <td className="primary whitespace-nowrap">A person decides</td>
            <td>
              Every AeroCopilot answer reads &ldquo;{ADVICE_ONLY}&rdquo; AeroCopilot can open a view, highlight records and
              pre-select an engagement pair. It cannot change data or commit a plan.
            </td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Sources shown</td>
            <td>
              Each answer lists the library records it drew on and its reasoning steps. Records a model cites are checked
              against the library, and ids it invents are dropped before the answer is shown.
            </td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Engine labelled</td>
            <td>
              Each answer names the engine that produced it: &ldquo;{OFFLINE_ENGINE.label}&rdquo;, or Claude via AWS
              Bedrock with the model id.
            </td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Offline by default</td>
            <td>
              {mode.reason}{' '}
              {mode.engine.engine === 'offline'
                ? 'This instance answers with the offline engine.'
                : `This instance answers with ${mode.engine.label}.`}
              {mode.engine.engine === 'bedrock' ? <span className="meta">{mode.engine.detail}</span> : null}
            </td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Answers logged</td>
            <td>
              Question, engine, model id, SHA-256 of the answer, cited records, time and tenant, for every answer.{' '}
              {audit.store === 'local'
                ? 'Stored locally on this instance in a hash-chained file, because the connected database has no audit table yet.'
                : 'Stored in the database, in a table that refuses edits and deletes.'}
            </td>
            <td>{audit.store === 'local' ? <Status kind="partial">Local file</Status> : <Status kind="done" />}</td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Testing</td>
            <td>
              The offline engine is deterministic and unit tested (<Code>lib/spectrum/_test_aerocopilot-engine.test.ts</Code>).
              SPECTRAL does not evaluate model answers; testing in proportion to use is for the customer.
            </td>
            <td>
              <Status kind="confirm" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Other AI features</td>
            <td>
              PCM scenario titles and the exercise referee&apos;s narration call the same Bedrock client
              {creds
                ? ', and can run with the AWS credentials on this instance.'
                : '. With no AWS credentials on this instance they make no model calls.'}{' '}
              They are not yet in this log. Referee results wait for directing-staff approval.
            </td>
            <td>
              <Status kind="partial" />
            </td>
          </tr>
        </Table>

        <SubHead id="ai-audit">Latest AI answers</SubHead>
        <div className="text-[12.5px] store-text-body m-0 mb-3 flex flex-wrap items-center gap-2">
          {audit.store === 'database' ? (
            <>
              <span className="tag green">Stored in the database</span>
              <span>
                Table <Code>ai_audit_log</Code>, append-only.
              </span>
            </>
          ) : audit.store === 'local' ? (
            <>
              <span className="tag amber">Stored locally on this instance</span>
              <span>
                <Code>data/audit/ai-audit.jsonl</Code>,{' '}
                {audit.local.intact ? 'hash chain intact' : `hash chain broken at line ${audit.local.brokenAt}`}.
              </span>
            </>
          ) : (
            <span className="tag">No answers logged yet</span>
          )}
          <a href="/api/v1/ai-audit?limit=50" className="fc-action">
            Open as JSON
          </a>
        </div>
        {audit.rows.length > 0 ? (
          <Table head={['Time (UTC)', 'Question', 'Engine', 'Answer SHA-256', 'Sources', 'Recorded by']} caption="Latest AI answers">
            {audit.rows.map((r) => (
              <tr key={r.id}>
                <td className="mono whitespace-nowrap">{utc(r.created_at).replace(' UTC', '')}</td>
                <td className="clip w-[34%]" title={r.question}>
                  {r.question}
                </td>
                <td className="whitespace-nowrap">
                  {r.engine === 'offline' ? 'Offline' : 'Bedrock'}
                  {r.model_id ? <span className="meta font-mono">{r.model_id}</span> : null}
                  {r.fallback ? <span className="meta">model unavailable</span> : null}
                </td>
                <td className="mono" title={r.answer_sha256}>
                  {r.answer_sha256.slice(0, 12)}
                </td>
                <td className="clip w-[22%]" title={(r.refs ?? []).map((x) => x.name).join(', ')}>
                  {(r.refs ?? []).length ? (
                    (r.refs ?? []).map((x) => x.name).join(', ')
                  ) : (
                    <span className="store-text-muted">none cited</span>
                  )}
                </td>
                <td className="whitespace-nowrap">{r.recorded_by === 'server' ? 'Server' : 'Browser'}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-[13px] store-text-muted m-0">
            No answers yet. Ask AeroCopilot a question in{' '}
            <a className="fc-action" href="/spectrum">
              Spectrum View
            </a>{' '}
            and it appears here.
          </p>
        )}
        <Note>
          Browser: an offline answer computed in the browser and reported to this instance. Server: a model answer
          recorded by the server that called the model, so a browser cannot claim one.
        </Note>
      </Section>

      {/* Sovereignty ------------------------------------------------------- */}
      <Section
        id="sovereignty"
        title="Sovereignty"
        lede="SPECTRAL is built to run as one private instance per customer. The outbound connections listed are read from this instance's own configuration."
      >
        <Table head={['Item', 'This instance', 'Status']} caption="Sovereignty">
          <tr>
            <td className="primary whitespace-nowrap">Deployment</td>
            <td>One private instance per customer. Where it runs, and who can reach it, is the customer&apos;s choice.</td>
            <td>
              <Status kind="confirm" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Data</td>
            <td>Open-source data only. No classified or export-controlled sources.</td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Fonts and assets</td>
            <td>
              Geist from its npm package and {fonts.length} font files served from <Code>/fonts</Code>. No font or asset
              CDN.
            </td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Third-party telemetry</td>
            <td>
              None. A test fails if any of {TELEMETRY_SIGNATURES.length} analytics or error-reporting services appears in the
              code or dependencies (<Code>lib/trust/_test_no-telemetry.test.ts</Code>).
              <span className="meta">{TELEMETRY_SIGNATURES.map((t) => t.service).join(', ')}</span>
            </td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Build tooling telemetry</td>
            <td>Next.js telemetry is switched off in the Docker image (NEXT_TELEMETRY_DISABLED=1).</td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
          <tr>
            <td className="primary whitespace-nowrap">Air-gapped updates</td>
            <td>{WATCHFLOOR_NAME} files are carried in and checked against the public key. The instance never fetches them.</td>
            <td>
              <Status kind="done" />
            </td>
          </tr>
        </Table>

        <SubHead>Outbound connections configured here</SubHead>
        <Table head={['Service', 'Used for', 'From', 'Configured']} caption="Outbound connections">
          {outbound.map((o) => (
            <tr key={o.service}>
              <td className="primary">{o.service}</td>
              <td>{o.use}</td>
              <td className="whitespace-nowrap">{o.from}</td>
              <td className="whitespace-nowrap">
                {o.state === 'required' ? (
                  <span className="tag">Required</span>
                ) : o.state === 'yes' ? (
                  <span className="tag amber">Yes</span>
                ) : o.state === 'on-request' ? (
                  <span className="tag">On request</span>
                ) : (
                  <span className="tag">No</span>
                )}
                {o.note ? <span className="meta">{o.note}</span> : null}
              </td>
            </tr>
          ))}
        </Table>
        <Note>
          Read from environment settings, presence only, never values. On an air-gapped instance leave the optional
          services unset; the 3D globes then need a local imagery and terrain source from the hosting.
        </Note>
      </Section>
    </div>
  )
}
