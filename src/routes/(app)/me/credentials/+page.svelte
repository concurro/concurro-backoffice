<script lang="ts">
	import { Check, KeyRound, LoaderCircle, Lock, X } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import UsageChart from '#lib/components/UsageChart.svelte';
	import { relTime } from '#lib/format.ts';
	import { credentialMeta, roleLabel } from '#lib/meta.ts';
	import { invalidateAll } from '$app/navigation';
	import { actions, MOCK, profile, session } from '#lib/api/index.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { CredentialRoute, Provider, Role, Target } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let editing = $state<CredentialRoute | null>(null);
	let editOpen = $state(false);
	let revoking = $state<CredentialRoute | null>(null);
	let revokeOpen = $state(false);
	let secret = $state('');
	let validating = $state(false);

	function edit(route: CredentialRoute) {
		editing = route;
		secret = '';
		editOpen = true;
	}

	async function save() {
		if (!editing) return;
		validating = true;
		try {
			if (MOCK) await new Promise((r) => setTimeout(r, 900));
			await actions.saveCredential(editing.id, secret);
			secret = '';
			editOpen = false;
			toast(`${editing.label} validated and saved`);
			if (!MOCK) await invalidateAll();
		} catch (error) {
			toast(error instanceof Error ? error.message : 'The credential could not be saved.', 'danger');
		} finally {
			validating = false;
		}
	}

	async function revoke() {
		if (!revoking) return;
		try {
			await actions.revokeCredential(revoking.id);
			revokeOpen = false;
			toast(`${revoking.label} revoked`, 'warning');
			if (!MOCK) await invalidateAll();
		} catch (error) {
			toast(error instanceof Error ? error.message : 'The credential could not be revoked.', 'danger');
		}
	}

	const roles = Object.keys(roleLabel) as Role[];
	/** Providers a role needs on a target that have no valid route. */
	function missing(target: Target, role: Role, routes: CredentialRoute[]): Provider[] {
		const needed = new Set(target.roster.filter((r) => r.role === role).map((r) => profile(r.profile).provider));
		return [...needed].filter((p) => !routes.some((c) => c.provider === p && c.status === 'valid'));
	}
</script>

<svelte:head><title>My credentials · Concurro</title></svelte:head>

<PageHeader title="My credentials" subtitle="Provider credentials that pay for the tasks you sponsor. Secrets are write-only: Concurro stores them encrypted and never shows them again." />

{#await data.result}
	<div class="routes">{#each { length: 4 } as _}<div class="route"><Skeleton rows={4} /></div>{/each}</div>
	<Panel title="Coverage"><Skeleton rows={4} /></Panel>
{:then { routes, targets, usage }}
	<div class="routes">
		{#each routes as route (route.id)}
			{@const has = !!route.fingerprint && route.status !== 'revoked'}
			<article class="route">
				<header>
					<div>
						<h2>{route.label}</h2>
						<p class="muted">{route.provider} · {route.kind}</p>
					</div>
					<Badge meta={credentialMeta[route.status]} />
				</header>
				<dl class="num">
					<div><dt>Fingerprint</dt><dd class="mono">{route.fingerprint ?? '—'}</dd></div>
					<div><dt>Last validated</dt><dd>{route.lastValidated ? relTime(route.lastValidated) : '—'}</dd></div>
					<div><dt>Last used</dt><dd>{route.lastUsed ? relTime(route.lastUsed) : '—'}</dd></div>
				</dl>
				{#if route.note}<p class="note">{route.note}</p>{/if}
				<footer>
					<Button size="sm" variant={route.status === 'valid' ? 'default' : 'primary'} icon={KeyRound} onclick={() => edit(route)}>{route.fingerprint ? 'Replace' : 'Add'}</Button>
					{#if has}<Button size="sm" variant="danger" onclick={() => { revoking = route; revokeOpen = true; }}>Revoke</Button>{/if}
				</footer>
			</article>
		{/each}
	</div>

	<Panel flush title="Coverage" meta="targets × required roles">
		<DataTable label="Credential coverage">
			<thead><tr><th>Target</th>{#each roles as role}<th>{roleLabel[role]}</th>{/each}</tr></thead>
			<tbody>
				{#each targets as target}
					<tr>
						<td class="mono nowrap">{target.owner}/{target.repo}</td>
						{#each roles as role}
							{@const gaps = missing(target, role, routes)}
							<td class="nowrap">
								{#if gaps.length}
									<Badge plain tone="danger" icon={X}>missing {gaps.join(', ')}</Badge>
								{:else}
									<Badge plain tone="success" icon={Check}>covered</Badge>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</DataTable>
		<p class="foot muted">A role is covered when you hold a valid credential for every provider its model profiles use.</p>
	</Panel>

	<Panel title="Usage" meta="by task and model">
		<UsageChart rows={usage} profiles={Object.keys(session.profiles)} />
	</Panel>
{:catch error}
	<ErrorState {error} />
{/await}

<Modal bind:open={editOpen} title="{editing?.fingerprint ? 'Replace' : 'Add'} {editing?.label ?? ''}" description="The secret is validated with the provider when you save.">
	<form id="cred" onsubmit={(e) => { e.preventDefault(); save(); }}>
		<label class="field">
			<span>{editing?.kind === 'Subscription' ? 'Session token' : 'API key'}</span>
			<input type="password" autocomplete="off" required minlength="8" bind:value={secret} placeholder="Paste the secret" />
		</label>
		<p class="hint"><Lock size={12} aria-hidden="true" /> Write-only. After saving you will only see its fingerprint{editing?.fingerprint ? `; the current one is ${editing.fingerprint}` : ''}.</p>
	</form>
	<div class="mock"><Alert tone="note" title="Mock only">Nothing you type leaves this browser tab.</Alert></div>
	{#snippet footer()}
		<Button onclick={() => (editOpen = false)}>Cancel</Button>
		<Button variant="primary" type="submit" form="cred" disabled={validating || secret.length < 8} icon={validating ? LoaderCircle : undefined}>{validating ? 'Validating…' : 'Validate and save'}</Button>
	{/snippet}
</Modal>

<Modal bind:open={revokeOpen} title="Revoke {revoking?.label ?? ''}?" description="Concurro deletes the stored secret. Sponsored tasks that need this route pause in awaiting_credentials until you add a new one.">
	{#snippet footer()}
		<Button onclick={() => (revokeOpen = false)}>Cancel</Button>
		<Button variant="danger-solid" onclick={revoke}>Revoke credential</Button>
	{/snippet}
</Modal>

<style>
	.routes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--s-3);
	}
	.route {
		display: grid;
		gap: var(--s-3);
		align-content: start;
		padding: var(--s-4);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.route header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--s-2);
	}
	.route header p {
		font-size: var(--fs-xs);
	}
	dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--s-2);
		margin: 0;
		font-size: var(--fs-sm);
	}
	dt {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	dd {
		margin: 0;
	}
	.note {
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.route footer {
		display: flex;
		gap: var(--s-2);
	}
	.foot {
		padding: var(--s-2) var(--s-4);
		border-top: 1px solid var(--border);
		font-size: var(--fs-xs);
	}
	.field {
		display: grid;
		gap: var(--s-1);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
	}
	.field input {
		height: 34px;
		padding: 0 var(--s-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		background: var(--surface);
		font-family: var(--font-mono);
	}
	.hint {
		margin-top: var(--s-2);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.hint :global(svg) {
		vertical-align: -1px;
	}
	.mock {
		margin-top: var(--s-4);
	}
	@media (max-width: 760px) {
		.routes {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
