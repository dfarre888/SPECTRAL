/**
 * `server-only` throws when imported outside a React Server Component build.
 * Vitest runs plain node, so it is aliased to this no-op (see vitest.config.ts)
 * — without it, any test touching a server module fails to load at all.
 */
export {}
