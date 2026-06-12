import { NextRequest, NextResponse } from 'next/server';
import { productByPriceId } from '@/constants/stripe-products';
import {
	expandEntitlements,
	isCompanyCore,
	isIndividualCore,
	legacySubscriptionTierHint,
	selectionFromLegacyTier,
	type AddonId,
	type OnboardingSelection,
	type OneOffId,
	type StoredSubscriptionEntitlement,
} from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseOnboardingMetadata } from '@/lib/stripe-entitlements';
import { fulfillExamTokensFromStripe } from '@/lib/exam-token-fulfillment';
import { mapStripeSubscriptionStatus, subscriptionTierFromMetadata } from '@/lib/stripe-subscription';

/**
 * Stripe Billing webhooks for SaaS subscriptions (onboarding / recurring).
 *
 * Stripe Dashboard → Developers → Webhooks → Add endpoint →
 *   URL: https://your-domain.com/api/webhooks/stripe-subscription
 *   Events: checkout.session.completed, customer.subscription.*, invoice.payment_succeeded,
 *           invoice.payment_failed
 *
 * Signing secret → STRIPE_SUBSCRIPTION_WEBHOOK_SECRET (whsec_...)
 */
export async function POST(req: NextRequest) {
	const stripeSecret = process.env.STRIPE_SECRET_KEY;
	const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
	if (!stripeSecret || !webhookSecret) {
		return NextResponse.json({ error: 'Stripe subscription webhook not configured' }, { status: 503 });
	}

	const admin = createAdminClient();

	let Stripe: typeof import('stripe').default;
	try {
		Stripe = (await import('stripe')).default;
	} catch {
		return NextResponse.json({ error: 'Stripe not installed' }, { status: 503 });
	}

	const stripe = new Stripe(stripeSecret, { apiVersion: '2026-02-25.clover' });
	const body = await req.text();
	const sig = req.headers.get('stripe-signature');
	if (!sig) {
		return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
	}

	let event: import('stripe').Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid signature';
		return NextResponse.json({ error: message }, { status: 400 });
	}

	// ── Idempotency guard ────────────────────────────────────────────────────
	// Stripe delivers at-least-once and replays on delivery failure. event.id is
	// trusted here (signature verified above). If we've already processed it,
	// short-circuit with 200 so Stripe stops retrying and we never re-fulfil.
	{
		const { data: seen } = await admin
			.from('processed_stripe_events')
			.select('stripe_event_id')
			.eq('stripe_event_id', event.id)
			.maybeSingle();
		if (seen) {
			return NextResponse.json({ received: true, duplicate: true });
		}
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as import('stripe').Stripe.Checkout.Session;
				const sessionMeta = (session.metadata ?? {}) as Record<string, string | undefined>;
				const purchaserId = sessionMeta.user_id?.trim() || session.client_reference_id?.trim();

				if (session.mode === 'subscription') {
					const subId =
						typeof session.subscription === 'string'
							? session.subscription
							: session.subscription?.id;
					if (!subId) break;
					const sub = await stripe.subscriptions.retrieve(subId, {
						expand: ['items.data.price'],
					});
					await syncSubscriptionToOrg(stripe, sub, admin);
					if (purchaserId) {
						const liveEntitlements = entitlementsFromLiveSubscriptionItems(sub);
						await fulfillExamTokensFromStripe(admin, {
							organizationId: sessionMeta.organization_id,
							purchasedByUserId: purchaserId,
							metadata: sessionMeta,
							entitlements: liveEntitlements ?? undefined,
							idempotencyKey: `checkout:${session.id}`,
						});
					}
				}
				break;
			}
			case 'customer.subscription.created': {
				const sub = event.data.object as import('stripe').Stripe.Subscription;
				await syncSubscriptionToOrg(stripe, sub, admin);
				const subMeta = (sub.metadata ?? {}) as Record<string, string | undefined>;
				const purchaserId = subMeta.user_id?.trim();
				if (purchaserId) {
					const liveEntitlements = entitlementsFromLiveSubscriptionItems(sub);
					await fulfillExamTokensFromStripe(admin, {
						organizationId: subMeta.organization_id,
						purchasedByUserId: purchaserId,
						metadata: subMeta,
						entitlements: liveEntitlements ?? undefined,
						idempotencyKey: `sub_created:${sub.id}`,
					});
				}
				break;
			}
			case 'customer.subscription.updated': {
				const sub = event.data.object as import('stripe').Stripe.Subscription;
				await syncSubscriptionToOrg(stripe, sub, admin);
				break;
			}
			case 'customer.subscription.deleted': {
				const sub = event.data.object as import('stripe').Stripe.Subscription;
				await syncSubscriptionToOrg(stripe, sub, admin, true);
				break;
			}
			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as import('stripe').Stripe.Invoice;
				const subId = invoiceSubscriptionId(invoice);
				if (subId) {
					const sub = await stripe.subscriptions.retrieve(subId);
					await syncSubscriptionToOrg(stripe, sub, admin);
				}
				break;
			}
			case 'invoice.payment_failed': {
				const failedInvoice = event.data.object as import('stripe').Stripe.Invoice;
				const failedSubId = invoiceSubscriptionId(failedInvoice);
				if (failedSubId) {
					await admin
						.from('organizations')
						.update({ subscription_status: 'past_due' })
						.eq('stripe_subscription_id', failedSubId);
				}
				break;
			}
			default:
				break;
		}
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : 'Webhook handler failed';
		console.error('[stripe-subscription webhook]', message);
		// Not recorded as processed → Stripe retries → per-operation idempotency
		// (fulfillmentExists / idempotent updates) prevents double side-effects.
		return NextResponse.json({ error: message }, { status: 500 });
	}

	// Record only after successful handling; replays now short-circuit above.
	// ignoreDuplicates guards the rare concurrent-delivery race.
	await admin
		.from('processed_stripe_events')
		.upsert({ stripe_event_id: event.id }, { onConflict: 'stripe_event_id', ignoreDuplicates: true });

	return NextResponse.json({ received: true });
}

function invoiceSubscriptionId(invoice: import('stripe').Stripe.Invoice): string | null {
	const raw = (invoice as import('stripe').Stripe.Invoice & { subscription?: string | { id?: string } | null })
		.subscription;
	if (typeof raw === 'string') return raw;
	return raw?.id ?? null;
}

async function syncSubscriptionToOrg(
	stripe: import('stripe').default,
	sub: import('stripe').Stripe.Subscription,
	admin: ReturnType<typeof createAdminClient>,
	deleted = false,
) {
	let orgId = sub.metadata?.organization_id?.trim();
	const tierLegacy = subscriptionTierFromMetadata(sub.metadata?.subscription_tier);

	if (!orgId) {
		const sessionList = await stripe.checkout.sessions.list({
			subscription: sub.id,
			limit: 1,
		});
		const sid = sessionList.data[0]?.metadata?.organization_id?.trim();
		if (sid) orgId = sid;
	}

	if (!orgId) {
		console.warn('[stripe-subscription] No organization_id in subscription metadata', sub.id);
		return;
	}

	let fullSub = sub;
	if (!sub.items?.data?.length || !sub.items.data.some((item) => item.price?.id)) {
		fullSub = await stripe.subscriptions.retrieve(sub.id, {
			expand: ['items.data.price'],
		});
	}

	const customerId = typeof fullSub.customer === 'string' ? fullSub.customer : fullSub.customer?.id ?? null;
	const cpe = (fullSub as unknown as { current_period_end?: number }).current_period_end;
	const periodEnd = cpe != null ? new Date(cpe * 1000).toISOString() : null;

	const mappedStatus = mapStripeSubscriptionStatus(fullSub.status);
	const terminalStatuses = ['canceled', 'unpaid'];
	const degradedStatuses = ['past_due'];

	const payload: Record<string, unknown> = {
		stripe_subscription_id: fullSub.id,
		stripe_customer_id: customerId,
		subscription_status: mappedStatus,
		subscription_current_period_end: periodEnd,
	};

	if (deleted || terminalStatuses.includes(mappedStatus)) {
		payload.subscription_entitlements = [];
		payload.subscription_tier = null;
		payload.onboarding_status = 'completed';
	} else if (degradedStatuses.includes(mappedStatus)) {
		// Grace period: retain entitlements while Stripe retries billing
	} else if (mappedStatus === 'active' || mappedStatus === 'trialing') {
		const liveEntitlements = entitlementsFromLiveSubscriptionItems(fullSub);
		const metadataEntitlements = await entitlementsFromMetadata(
			fullSub.metadata as Record<string, string | undefined>,
			tierLegacy,
			admin,
			orgId,
		);

		const finalEntitlements = liveEntitlements ?? metadataEntitlements;
		if (finalEntitlements) {
			payload.subscription_entitlements = finalEntitlements;
			const selection = selectionFromStoredEntitlements(finalEntitlements);
			if (selection) {
				payload.onboarding_path = selection.path;
				payload.subscription_tier = legacySubscriptionTierHint(selection);
			} else if (tierLegacy) {
				payload.onboarding_path = 'company';
				payload.subscription_tier = tierLegacy;
			}
		}
		payload.onboarding_status = 'completed';
	}

	const { error } = await admin.from('organizations').update(payload).eq('id', orgId);
	if (error) {
		throw new Error(error.message);
	}
}

/** Map live Stripe subscription line items → expanded entitlement strings. */
function entitlementsFromLiveSubscriptionItems(
	sub: import('stripe').Stripe.Subscription,
): StoredSubscriptionEntitlement[] | null {
	const livePriceIds = (sub.items?.data ?? [])
		.map((item) => item.price?.id)
		.filter((id): id is string => Boolean(id));

	if (livePriceIds.length === 0) return null;

	const rawEntitlements: string[] = [];
	for (const priceId of livePriceIds) {
		const product = productByPriceId(priceId);
		if (product?.entitlement) {
			rawEntitlements.push(product.entitlement);
		} else {
			console.warn(
				'[stripe-subscription] No product mapping for price id',
				priceId,
				'— check STRIPE_PRICE_* env vars in webhook environment',
			);
		}
	}

	if (rawEntitlements.length === 0) return null;

	const selection = selectionFromEntitlementStrings(rawEntitlements);
	if (!selection) return null;

	return expandEntitlements(selection);
}

function selectionFromEntitlementStrings(raw: string[]): OnboardingSelection | null {
	let core: OnboardingSelection['core'] | null = null;
	let path: OnboardingSelection['path'] | null = null;
	const addons: AddonId[] = [];
	const oneOffs: OneOffId[] = [];

	for (const ent of raw) {
		if (ent.startsWith('core:')) {
			const id = ent.slice('core:'.length);
			if (isIndividualCore(id)) {
				core = id;
				path = 'individual';
			} else if (isCompanyCore(id)) {
				core = id;
				path = 'company';
			}
		} else if (ent.startsWith('addon:')) {
			addons.push(ent.slice('addon:'.length) as AddonId);
		} else if (ent.startsWith('oneoff:')) {
			const id = ent.slice('oneoff:'.length);
			if (id === 'reoc_application' || id === 'repl_course') {
				oneOffs.push(id);
			}
		}
	}

	if (!core || !path) return null;

	return {
		path,
		core,
		addons,
		oneOffs: oneOffs.length > 0 ? oneOffs : undefined,
	};
}

function selectionFromStoredEntitlements(
	entitlements: StoredSubscriptionEntitlement[],
): OnboardingSelection | null {
	const purchasable = entitlements.filter(
		(e) => e.startsWith('core:') || e.startsWith('addon:') || e.startsWith('oneoff:'),
	);
	return selectionFromEntitlementStrings(purchasable);
}

/** Fallback: checkout-time metadata snapshot (legacy / addon-only checkout). */
async function entitlementsFromMetadata(
	meta: Record<string, string | undefined>,
	tierLegacy: ReturnType<typeof subscriptionTierFromMetadata>,
	admin: ReturnType<typeof createAdminClient>,
	orgId: string,
): Promise<StoredSubscriptionEntitlement[] | null> {
	const parsed = parseOnboardingMetadata(meta);
	if (parsed) {
		return expandEntitlements(parsed);
	}
	if (tierLegacy) {
		return expandEntitlements(selectionFromLegacyTier(tierLegacy));
	}

	const singleEnt = meta.entitlement?.trim();
	if (!singleEnt) return null;

	const { data: orgRow } = await admin
		.from('organizations')
		.select('subscription_entitlements')
		.eq('id', orgId)
		.maybeSingle();
	const existing = Array.isArray(orgRow?.subscription_entitlements)
		? [...((orgRow?.subscription_entitlements ?? []) as string[])]
		: [];
	if (!existing.includes(singleEnt)) {
		existing.push(singleEnt);
	}
	return existing as StoredSubscriptionEntitlement[];
}
