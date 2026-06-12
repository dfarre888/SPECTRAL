/** Local training / sales demo — bypasses auth gate and uses service-role reads server-side. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}
