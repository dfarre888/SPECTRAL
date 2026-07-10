import { NextResponse } from 'next/server';

export function plannerErrorResponse(err: unknown, fallback = 'Internal server error'): NextResponse {
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
