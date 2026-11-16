import { profile } from '#lib/api/session.svelte.ts';
import type { CredentialEntry, CredentialPolicy, CredentialRecovery, ProfileFilter, Provider, Target } from '#lib/types.ts';

/** A profile a filter can name; `model` is absent while its target or profile is unavailable. */
export interface ProfileOption extends ProfileFilter {
	model?: string;
}

export const sameProfile = (a: ProfileFilter, b: ProfileFilter) => a.target === b.target && a.profile === b.profile;

/** Whether an entry's filters admit a role's call under a profile on target `owner/repo`. */
export const admits = (policy: CredentialPolicy, role: string, filter: ProfileFilter) =>
	(!policy.roles.length || policy.roles.includes(role)) && (!policy.profiles.length || policy.profiles.some((p) => sameProfile(p, filter)));

/** One provider's profiles by target, followed by selected ones no visible target offers any more. */
export function profileOptions(targets: Target[], provider: Provider, selected: ProfileFilter[]): ProfileOption[] {
	const known = targets.flatMap((target) => {
		const profiles = target.profiles ?? [...new Set(target.roster.map((entry) => entry.profile))].map(profile);
		return profiles
			.filter((p) => p.provider === provider)
			.map((p) => ({ target: `${target.owner}/${target.repo}`, profile: p.name, model: p.model }));
	});
	return [...known, ...selected.filter((filter) => !known.some((option) => sameProfile(option, filter)))];
}

/** A short description of what an entry is used for. */
export function filterSummary(policy: CredentialPolicy, roles: { key: string; label: string }[]): string {
	const label = (key: string) => roles.find((role) => role.key === key)?.label ?? key;
	const parts = [];
	if (policy.roles.length) parts.push(policy.roles.length > 2 ? `${policy.roles.length} roles` : policy.roles.map(label).join(', '));
	if (policy.profiles.length)
		parts.push(policy.profiles.length > 1 ? `${policy.profiles.length} profiles` : `${policy.profiles[0].profile} in ${policy.profiles[0].target}`);
	return parts.join(' · ') || 'All work';
}

/** Whether a selection of the paused call is queued and not yet acted on. */
export const recoveryQueued = (recovery?: CredentialRecovery | null) =>
	!!recovery?.eligible && !!recovery.delivery && !recovery.consumed?.includes(recovery.delivery.id);

/** An entry as a later listing has it, with the revision its next write must name; absent once removed. */
export const currentEntry = (entries: CredentialEntry[], entry: CredentialEntry) => entries.find((found) => found.id === entry.id);
