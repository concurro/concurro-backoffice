<script lang="ts">
	import { AlertTriangle, Building2, Clock, Info, RefreshCw, User, X } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { actions, api, session } from '#lib/api/index.ts';
	import { absTime } from '#lib/format.ts';
	import { PROVIDERS, providerFunding, providerName, type Payer } from '#lib/funding.ts';
	import { withBase } from '#lib/paths.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { CredentialListing, IssueRef, Provider, Sponsorship, Target } from '#lib/types.ts';
	import Panel from './Panel.svelte';

	interface Props {
		issue: IssueRef;
		projection?: Sponsorship;
		writer?: boolean;
		/** The configured target, whose `owner/repo` credential profile filters name; filters go unchecked without it. */
		target?: Pick<Target, 'owner' | 'repo'>;
		refresh?: () => unknown;
		/** How the funding commands are sent; a standalone review has its own command route. */
		post?: (issue: IssueRef, command: 'sponsor' | 'withdraw' | 'funding', arg: string) => Promise<string>;
	}
	let { issue, projection, writer = false, target, refresh = invalidateAll, post = actions.command }: Props = $props();
	let busy = $state(false);
	let listing = $state<CredentialListing>();
	const me = $derived(session.me.id ? String(session.me.id) : '');
	const rows = $derived(PROVIDERS.map((provider) => providerFunding(projection, provider, me, listing, target ? `${target.owner}/${target.repo}` : '')));
	const alert = $derived(rows.find((row) => row.alert && row.alert.kind !== 'warning')?.alert);

	const POLICY =
		'Each provider is paid either by the organization or by one person’s credentials. ' +
		'There is no organization fallback: personal funding without a usable credential pauses the call. ' +
		'Changes apply to future calls; attempts already charged keep their payer. ' +
		'Withdrawing removes only your own consent.';

	let reads = 0;
	/** Reads the viewer's lists again; a failed or superseded read leaves the person icon neutral. */
	function loadListing() {
		const read = ++reads;
		api.credentialListing().then(
			(value) => read === reads && (listing = value),
			() => read === reads && (listing = undefined)
		);
	}
	// Every new projection, from a refresh or a command, rereads the lists with it.
	$effect(() => {
		if (me && projection !== null) loadListing();
	});
	function reload() {
		refresh();
		loadListing();
	}

	const due = (seconds?: number) => (!seconds || seconds * 1000 <= Date.now() ? 'shortly' : `at ${absTime(new Date(seconds * 1000).toISOString())}`);

	/** The command always binds one provider and the authenticated caller, never another owner. */
	async function command(command: 'withdraw' | 'funding', provider: Provider, funding?: 'org' | 'personal') {
		if (busy) return;
		busy = true;
		try {
			toast(await post(issue, command, funding ? `${provider} ${funding}` : provider));
			await invalidateAll();
		} catch (error) {
			toast(error instanceof Error ? error.message : 'The command could not be posted.', 'danger');
		} finally {
			busy = false;
		}
	}

	function tip(row: ReturnType<typeof providerFunding>, segment: Payer, text: string) {
		return row.intended === segment || (segment === 'none' && row.withdrawing) ? `Pending: ${text}` : text;
	}
</script>

<Panel title="Funding" id="sponsorship">
	{#snippet actions()}
		<span class="icon" role="img" aria-label={POLICY} title={POLICY}><Info size={14} aria-hidden="true" /></span>
		<button class="icon" onclick={reload} disabled={busy} aria-label="Refresh funding" title="Refresh"><RefreshCw size={14} aria-hidden="true" /></button>
	{/snippet}
	<ul>
		{#each rows as row (row.provider)}
			{@const name = providerName(row.provider)}
			{@const danger = !!row.unusable && row.payer !== 'other'}
			{@const held = row.mine && row.payer !== 'me'}
			{@const meTip = row.payer === 'other' ? `@${row.sponsor} pays with their credentials` : row.payer === 'me' ? 'You pay with your credentials' : held ? `You have given consent${row.payer === 'org' ? '; the organization pays' : ''}` : 'Use your credentials'}
			<li>
				<span class="name">
					{name}
					{#if row.alert}
						<span class="flag {row.alert.kind}" role="img" aria-label={row.alert.text} title="{row.alert.text}{row.alert.due !== undefined ? ` ${due(row.alert.due)}` : ''}">
							{#if row.alert.kind === 'cooling'}<Clock size={14} aria-hidden="true" />{:else}<AlertTriangle size={14} aria-hidden="true" />{/if}
						</span>
					{/if}
				</span>
				<span class="seg" role="group" aria-label="{name} funding">
					{#if writer && row.payer !== 'me'}
						<button class:on={row.payer === 'other'} class:held class:danger class:pending={row.intended === 'me'} disabled={busy} onclick={() => command('funding', row.provider, 'personal')} aria-pressed={row.payer === 'other'} title={tip(row, 'me', `${meTip}${danger ? `\n${row.unusable}` : ''}`)} aria-label={row.payer === 'other' ? `@${row.sponsor} pays; use your credentials` : 'Use your credentials'}>
							{#if row.payer === 'other'}<span class="initials">{row.sponsor?.slice(0, 2).toUpperCase()}</span>{:else}<User size={15} aria-hidden="true" />{/if}
						</button>
					{:else}
						<span class="state" class:on={row.payer === 'me' || row.payer === 'other'} class:held class:danger class:pending={row.intended === 'me'} role="img" title={tip(row, 'me', `${meTip}${danger ? `\n${row.unusable}` : ''}`)} aria-label={meTip}>
							{#if row.payer === 'other'}<span class="initials">{row.sponsor?.slice(0, 2).toUpperCase()}</span>{:else}<User size={15} aria-hidden="true" />{/if}
						</span>
					{/if}
					{#if writer && row.payer !== 'org'}
						<button class:pending={row.intended === 'org'} disabled={busy} onclick={() => command('funding', row.provider, 'org')} aria-pressed="false" title={tip(row, 'org', 'Use organization credentials')} aria-label="Use organization credentials"><Building2 size={15} aria-hidden="true" /></button>
					{:else}
						<span class="state" class:on={row.payer === 'org'} class:pending={row.intended === 'org'} role="img" title={tip(row, 'org', row.payer === 'org' ? 'The organization pays' : 'Organization credentials')} aria-label={row.payer === 'org' ? 'The organization pays' : 'Organization credentials'}><Building2 size={15} aria-hidden="true" /></span>
					{/if}
					{#if row.mine}
						<button class:on={row.payer === 'none'} class:pending={row.withdrawing || row.intended === 'none'} disabled={busy} onclick={() => command('withdraw', row.provider)} title={tip(row, 'none', `Withdraw your consent${row.payer === 'me' ? '; calls pause until someone else pays' : ''}`)} aria-label="Withdraw your {name} consent"><X size={15} aria-hidden="true" /></button>
					{:else if row.payer === 'none' || row.intended === 'none'}
						<span class="state" class:on={row.payer === 'none'} class:pending={row.intended === 'none'} role="img" title={tip(row, 'none', 'No one pays; calls pause')} aria-label="No one pays; calls pause"><X size={15} aria-hidden="true" /></span>
					{/if}
				</span>
			</li>
		{/each}
	</ul>
	{#if alert}
		<p class="alert {alert.kind}">
			{alert.text}{#if alert.due !== undefined}{' '}{due(alert.due)}.{/if}
			{#if alert.kind === 'paused'}<a href={withBase('/me/credentials')}>My credentials</a>{/if}
		</p>
	{/if}
</Panel>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-2);
		padding: var(--s-2) 0;
		font-size: var(--fs-sm);
	}
	li + li {
		border-top: 1px solid var(--border);
	}
	.name {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: var(--fw-semibold);
	}
	.flag {
		display: inline-flex;
		color: var(--warning-fg);
	}
	.flag.paused {
		color: var(--danger-fg);
	}
	.seg {
		display: inline-flex;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		overflow: hidden;
	}
	.seg > * {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 26px;
		padding: 0;
		border: 0;
		background: var(--surface);
		color: var(--text-3);
	}
	.seg > * + * {
		border-left: 1px solid var(--border-strong);
	}
	.seg button {
		cursor: pointer;
	}
	.seg button:hover:not(:disabled) {
		background: var(--surface-2);
		color: var(--text);
	}
	.seg .on {
		background: var(--accent-soft);
		color: var(--accent-text);
	}
	.seg .held {
		color: var(--accent-text);
	}
	.seg .danger {
		color: var(--danger-fg);
	}
	.seg .danger.on {
		background: var(--danger-bg);
	}
	.seg .pending {
		outline: 1px dashed var(--accent);
		outline-offset: -3px;
	}
	.seg :focus-visible {
		outline-offset: -2px;
	}
	.initials {
		font-size: 10px;
		font-weight: var(--fw-semibold);
	}
	.icon {
		display: inline-flex;
		padding: 4px;
		border: 0;
		border-radius: var(--r-sm);
		background: none;
		color: var(--text-3);
		cursor: help;
	}
	button.icon {
		cursor: pointer;
	}
	button.icon:hover:not(:disabled) {
		color: var(--text);
	}
	.alert {
		margin: var(--s-2) 0 0;
		padding-top: var(--s-2);
		border-top: 1px solid var(--border);
		font-size: var(--fs-xs);
		color: var(--danger-fg);
	}
	.alert.cooling {
		color: var(--warning-fg);
	}
	.alert a {
		color: inherit;
		text-decoration: underline;
	}
</style>
