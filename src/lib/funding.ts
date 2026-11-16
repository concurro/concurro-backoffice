import { admits, recoveryQueued } from '#lib/credentials.ts';
import type { CredentialListing, CredentialRequirement, Provider, Sponsorship } from '#lib/types.ts';

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
	/** Removal of the current sponsor's consent awaits confirmation, whoever pays. */
	withdrawing: boolean;
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

/**
 * Why the viewer's own list cannot serve a provider's calls on the configured target `owner/repo`;
 * absent when it can or the list is unknown. Filters are not matched while the target is unknown.
 */
function ownGap(listing: CredentialListing | undefined, provider: Provider, target: string, requirements: CredentialRequirement[]): string | undefined {
	if (!listing) return undefined;
	const entries = listing.providers.find((list) => list.provider === provider)?.entries ?? [];
	const usable = entries.filter((entry) => entry.enabled && entry.status === 'valid');
	if (!entries.length) return `You have no ${providerName(provider)} credential.`;
	if (!usable.length) return `Your ${providerName(provider)} credentials are all turned off or need a new token.`;
	if (!target) return undefined;
	const unmatched = requirements.filter((route) => !usable.some((entry) => admits(entry, route.role, { target, profile: route.profile })));
	return unmatched.length ? unmatched.map((route) => `${callName(route)}: none of your credentials is set to be used for this`).join('\n') : undefined;
}

const callName = (route: CredentialRequirement) => `${route.role.replaceAll('_', ' ')} · ${route.model}`;

/** One provider's funding as the compact widget shows it to viewer `me`. */
export function providerFunding(projection: Sponsorship | undefined, provider: Provider, me: string, listing?: CredentialListing, target = ''): ProviderFunding {
	const slot = projection?.slots?.[provider];
	const mine = !!me && slot?.sponsor_id === me;
	const shared = projection?.funding === 'org' || projection?.funding === 'contributed' ? projection.funding : undefined;
	const funding = projection?.provider_funding?.[provider] ?? shared;
	// A consent-only view omits funding, so its payer stays unknown even when the viewer holds consent.
	const payer = projection?.scope === 'own' ? undefined : payerOf(funding, slot?.sponsor_id, me);
	const source = projection?.source_slots?.[provider];
	const sourceFunding = projection?.source_provider_funding?.[provider];
	const intended = projection?.scope === 'own' ? undefined : payerOf(sourceFunding ?? funding, source?.sponsor_id !== undefined ? source.sponsor_id : slot?.sponsor_id, me);
	// A withdrawal names a null sponsor; a pending funding change alone leaves the sponsor out.
	const withdrawing = !!slot?.sponsor_id && source?.sponsor_id === null;
	const pending =
		(intended !== undefined && intended !== payer) ||
		withdrawing ||
		!!projection?.pending?.includes(provider) ||
		(!!projection && projection.scope !== 'own' && (projection.status !== 'confirmed' || projection.task_status === 'pending'));

	const requirements = projection?.coverage?.[provider] ?? [];
	const gaps = payer === 'me' ? requirements.filter((route) => route.status !== 'available') : [];
	const unusable = gaps.length
		? gaps.map((route) => `${callName(route)}: ${COVERAGE[route.status ?? 'unknown'] ?? route.status}`).join('\n')
		: ownGap(listing, provider, target, requirements);

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

	return { provider, payer, sponsor: slot?.login ?? slot?.sponsor_id ?? undefined, mine, pending, intended: intended !== payer ? intended : undefined, withdrawing, unusable, alert };
}
