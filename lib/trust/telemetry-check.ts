/**
 * Third-party analytics, telemetry and error-reporting signatures that must
 * not appear in SPECTRAL. Enforced by lib/trust/_test_no-telemetry.test.ts,
 * which scans package.json and the app, components, lib and public source.
 * The Trust page lists the services checked from here.
 */
export interface TelemetrySignature {
  service: string
  /** Package names or hostnames; matched case-insensitively as plain text. */
  needles: string[]
}

export const TELEMETRY_SIGNATURES: readonly TelemetrySignature[] = [
  { service: 'Google Analytics and Tag Manager', needles: ['google-analytics.com', 'googletagmanager.com', 'gtag(', 'react-ga', '@next/third-parties'] },
  { service: 'Vercel Analytics and Speed Insights', needles: ['@vercel/analytics', '@vercel/speed-insights', 'vitals.vercel-insights'] },
  { service: 'Sentry', needles: ['@sentry/', 'sentry.io', 'ingest.sentry'] },
  { service: 'PostHog', needles: ['posthog'] },
  { service: 'Segment', needles: ['segment.com', 'segment.io', '@segment/'] },
  { service: 'Mixpanel', needles: ['mixpanel'] },
  { service: 'Amplitude', needles: ['amplitude.com', '@amplitude/'] },
  { service: 'Hotjar', needles: ['hotjar'] },
  { service: 'Microsoft Clarity', needles: ['clarity.ms'] },
  { service: 'FullStory', needles: ['fullstory'] },
  { service: 'LogRocket', needles: ['logrocket'] },
  { service: 'Datadog RUM', needles: ['datadoghq', '@datadog/'] },
  { service: 'New Relic', needles: ['newrelic', 'nr-data.net'] },
  { service: 'Bugsnag', needles: ['bugsnag'] },
  { service: 'Plausible and Umami', needles: ['plausible.io', 'umami.is'] },
]
