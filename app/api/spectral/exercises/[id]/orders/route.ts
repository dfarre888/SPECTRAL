import { NextRequest, NextResponse } from 'next/server';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { writeAuditLog } from '@/lib/operations/audit';
import { getDemoTenantId } from '@/lib/demo';

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();

    if (!body.force || !body.player_id || !body.orders) {
      return NextResponse.json(
        { error: 'force, player_id, and orders are required' },
        { status: 400 },
      );
    }

    if (!['RED', 'BLUE'].includes(body.force)) {
      return NextResponse.json({ error: 'force must be RED or BLUE' }, { status: 400 });
    }

    const result = await worldStateEngine.submitOrders({
      exercise_id: params.id,
      force: body.force,
      player_id: body.player_id,
      orders: body.orders,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    void writeAuditLog({
      tenantId: getDemoTenantId(),
      userId: auth.user!.id,
      action: 'pcm.orders.submit',
      resourceType: 'exercise',
      resourceId: params.id,
      classification: 'UNCLASSIFIED',
      metadata: { force: body.force, turn: body.turn },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[SPECTRAL] POST /exercises/:id/orders error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
