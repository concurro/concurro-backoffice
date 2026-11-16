import { recoveryQueued } from '#lib/credentials.ts';
import type { CredentialListing, Provider, Sponsorship } from '#lib/types.ts';

export const PROVIDERS: Provider[] = ['openai', 'anthropic'];
export const providerName = (provider: Provider) => (provider === 'openai' ? 'OpenAI' : 'Anthropic');

/** Who pays for a provider's future calls; `none` is personal funding without a sponsor, so calls pause. */
export type Payer = 'me' | 'org' | 'other' | 'none';

export interface ProviderFunding {
	provider: Provider;
	/** Absent while funding is unconfirmed. */
	payer?: Payer;
	/** The sponsor's login when someone holds consent. */
	sponsor?: string;
	/** The viewer holds this provider's consent. */
	mine: boolean;
	/** A choice not yet confirmed or adopted, and what it would change to. */
	pending: boolean;
	intended?: Payer;
	/** Why the viewer's own credentials cannot serve this provider now. */
	unusable?: string;
	/** A pause or a sponsor gap this provider causes. */
	alert?: { kind: 'paused' | 'cooling' | 'warning'; text: string; due?: number };
}

/** The status phrases selection reports for a role's call. */
const COVERAGE: Record<string, string> = {
	reconnect: 'needs a new token',
	missing: 'no matching enabled credential',
	unknown: 'credentials unavailable',
	unassigned: 'no sponsor'
};

function payerOf(funding: string | undefined, sponsor: string | null | undefined, me: string): Payer | undefined {
	if (funding === 'org') return 'org';
	if (funding !== 'contributed') return undefined;
	return !sponsor ? 'none' : sponsor === me ? 'me' : 'other';
}

/** Why the viewer's own list cannot serve a provider; absent when it can or the list is unknown. */
function ownGap(listing: CredentialListing | undefined, provider: Provider): string | undefined {
	if (!listing) return undefined;
	const entries = listing.providers.find((list) => list.provider === provider)?.entries ?? [];
	if (entries.some((entry) => entry.enabled && entry.status === 'valid')) return undefined;
	return entries.length
		? `Your ${providerName(provider)} credentials are all turned off or need a new token.`
		: `You have no ${providerName(provider)} credential.`;
}

/** One provider's funding as the compact widget shows it to viewer `me`. */
export function providerFunding(projection: Sponsorship | undefined, provider: Provider, me: string, listing?: CredentialListing): ProviderFunding {
	const slot = projection?.slots?.[provider];
	const mine = !!me && slot?.sponsor_id === me;
	const shared = projection?.funding === 'org' || projection?.funding === 'contributed' ? projection.funding : undefined;
	const funding = projection?.provider_funding?.[provider] ?? shared;
	const payer = payerOf(funding, slot?.sponsor_id, me) ?? (projection?.scope === 'own' && mine ? 'me' : undefined);
	const source = projection?.source_slots?.[provider];
	const sourceFunding = projection?.source_provider_funding?.[provider];
	const intended = payerOf(sourceFunding ?? funding, source?.sponsor_id !== undefined ? source.sponsor_id : slot?.sponsor_id, me);
	const pending =
		(intended !== undefined && intended !== payer) ||
		!!projection?.pending?.includes(provider) ||
		(!!projection && projection.scope !== 'own' && (projection.status !== 'confirmed' || projection.task_status === 'pending'));

	const gaps = payer === 'me' ? projection?.coverage?.[provider]?.filter((route) => route.status !== 'available') ?? [] : [];
	const unusable = gaps.length
		? gaps.map((route) => `${route.role.replaceAll('_', ' ')} · ${route.model}: ${COVERAGE[route.status ?? 'unknown'] ?? route.status}`).join('\n')
		: ownGap(listing, provider);

	let alert: ProviderFunding['alert'];
	const recovery = projection?.recovery;
	if (projection?.task_stage === 'awaiting_credentials' && (recovery?.requirement?.provider ?? (funding === 'contributed' ? provider : undefined)) === provider) {
		if (recoveryQueued(recovery) && recovery?.delivery)
			alert = recovery.delivery.reason === 'wake'
				? { kind: 'cooling', text: 'Cooling down, retries', due: recovery.delivery.due_at }
				: { kind: 'cooling', text: 'Selecting a credential', due: recovery.delivery.due_at };
		else if (payer === 'none') alert = { kind: 'paused', text: `Paused · ${providerName(provider)} calls need a sponsor.` };
		else if (recovery?.eligible) alert = { kind: 'paused', text: `Paused · ${recovery.failures?.length ? 'every matching credential failed' : 'no matching enabled credential'}.` };
		else alert = { kind: 'paused', text: 'Paused · a writer must retry.' };
	} else if (payer === 'none') alert = { kind: 'warning', text: `No sponsor · ${providerName(provider)} calls will pause.` };

	return { provider, payer, sponsor: slot?.login ?? slot?.sponsor_id ?? undefined, mine, pending, intended: pending ? intended : undefined, unusable, alert };
}
