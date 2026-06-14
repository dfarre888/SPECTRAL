import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

/** Service-role Supabase client for Node scripts and WSE (Node 20 needs ws transport). */
export function createServiceRoleNodeClient(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error('SPECTRAL: Missing Supabase environment variables');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket as import('@supabase/supabase-js').WebSocketLikeConstructor },
  });
}
