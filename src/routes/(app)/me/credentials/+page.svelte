<script lang="ts">
	import { KeyRound, LoaderCircle } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { actions, MOCK } from '#lib/api/index.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import { credentialMeta } from '#lib/meta.ts';
	import { relTime } from '#lib/format.ts';
	import type { CredentialRequirement, CredentialRoute } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let editing = $state<CredentialRoute | null>(null);
	let editOpen = $state(false);
	let revoking = $state<CredentialRoute | null>(null);
	let revokeOpen = $state(false);
	let secret = $state('');
	let validating = $state(false);
	$effect(() => { if (!editOpen) secret = ''; });

	/** Start a write-only replacement without retaining a previous form value. */
	function edit(route: CredentialRoute) { editing = route; secret = ''; editOpen = true; }
	/** Keep a rejected replacement from destroying the last usable record. */
	async function save() {
		if (!editing || validating) return;
		validating = true;
		try {
			await actions.saveCredential(editing.id, secret);
			editOpen = false;
			toast(`${editing.label} validated and saved`);
			await invalidateAll();
		} catch (error) { toast(error instanceof Error ? error.message : 'The credential could not be saved.', 'danger'); }
		finally { secret = ''; validating = false; }
	}
	/** Revoke only this user's personal route; org-paid sessions remain unchanged. */
	async function revoke() {
		if (!revoking) return;
		try { await actions.revokeCredential(revoking.id); revokeOpen = false; toast(`${revoking.label} revoked`, 'warning'); await invalidateAll(); }
		catch (error) { toast(error instanceof Error ? error.message : 'The credential could not be revoked.', 'danger'); }
	}
	/** Coverage uses the trusted configured route and validated model list, never a harness guess. */
	function coverage(requirement: CredentialRequirement, routes: CredentialRoute[]): string {
		if (!requirement.route) return 'route not configured';
		const record = routes.find((r) => r.route === requirement.route);
		if (!record || record.status !== 'valid') return record?.status ?? 'missing';
		if (!record.models) return 'model coverage unknown';
		return record.models.includes(requirement.model) ? 'available' : 'model unavailable';
	}
</script>

<svelte:head><title>My credentials · Concurro</title></svelte:head>
<PageHeader title="My credentials" subtitle="Write-only personal credentials for prospective provider sponsorship. Current inference remains org-funded; storing, replacing or revoking a personal key does not change current org sessions." />
{#await data.result}<Skeleton rows={8} />{:then { routes, targets }}
	<div class="routes">
		{#each routes as route (route.id)}
			<article class="route">
				<header><div><h2>{route.label}</h2><p class="muted">{route.provider} · {route.kind}</p></div><Badge meta={credentialMeta[route.status]} /></header>
				<dl>
					<div><dt>Fingerprint</dt><dd class="mono">{route.fingerprint ?? '—'}</dd></div>
					<div><dt>Validated</dt><dd>{route.lastValidated ? relTime(route.lastValidated) : 'unknown'}</dd></div>
					<div><dt>Last resolved</dt><dd>{route.lastUsed ? relTime(route.lastUsed) : 'never / unknown'}</dd></div>
					<div><dt>Expiry</dt><dd>{route.expiryKnown && route.expiresAt ? route.expiresAt : 'unknown'}</dd></div>
				</dl>
				{#if route.note}<p class="note">{route.note}</p>{/if}
				<footer><Button size="sm" icon={KeyRound} disabled={!route.registrationAvailable || validating} onclick={() => edit(route)}>{route.fingerprint ? 'Replace' : 'Add'}</Button>{#if route.fingerprint && route.status !== 'revoked'}<Button size="sm" variant="danger" onclick={() => { revoking = route; revokeOpen = true; }}>Revoke</Button>{/if}</footer>
			</article>
		{/each}
	</div>
	<Panel title="Configured route coverage" meta="prospective · no current personal charges">
		{#each targets as target}
			<h3>{target.owner}/{target.repo}</h3>
			{#if target.credentialRequirements?.length}<ul>{#each target.credentialRequirements as requirement}<li><span class="mono">{requirement.profile}</span> · {requirement.role.replaceAll('_', ' ')} · {requirement.route ?? 'no configured route'} · {requirement.model} · <strong>{coverage(requirement, routes)}</strong></li>{/each}</ul>{:else}<p class="muted">Configured route requirements are unavailable; coverage is unknown.</p>{/if}
		{/each}
	</Panel>
{:catch error}<ErrorState {error} />{/await}

<Modal bind:open={editOpen} title="{editing?.fingerprint ? 'Replace' : 'Add'} {editing?.label ?? ''}" description="The provider validates this API key and lists available models before it replaces the current record.">
	<form id="credential" onsubmit={(event) => { event.preventDefault(); save(); }}><label>API key<input type="password" autocomplete="off" required bind:value={secret} /></label><p class="note">The value is cleared after each attempt and when this dialog closes. You can never read it back. A rejected replacement leaves the previous record intact.</p></form>
	{#if MOCK}<Alert tone="note" title="Mock mode">Synthetic validation only. Nothing leaves this browser tab.</Alert>{/if}
	{#snippet footer()}<Button onclick={() => editOpen = false}>Cancel</Button><Button type="submit" form="credential" variant="primary" disabled={validating || !secret} icon={validating ? LoaderCircle : undefined}>{validating ? 'Validating…' : 'Validate and save'}</Button>{/snippet}
</Modal>
<Modal bind:open={revokeOpen} title="Revoke {revoking?.label ?? ''}?" description="Deletes this stored personal secret. Your prospective sponsorship remains visible with missing coverage. Current org-paid inference and sessions are unaffected. It does not revoke the key at the provider.">
	{#snippet footer()}<Button onclick={() => revokeOpen = false}>Cancel</Button><Button variant="danger-solid" onclick={revoke}>Revoke stored key</Button>{/snippet}
</Modal>
<style>
	.routes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-3); }
	.route { display: grid; gap: var(--s-3); padding: var(--s-4); border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); }
	header, footer { display: flex; gap: var(--s-2); justify-content: space-between; flex-wrap: wrap; }
	dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-2); margin: 0; font-size: var(--fs-sm); }
	dt, .note { font-size: var(--fs-xs); color: var(--text-2); }
	dd { margin: 0; overflow-wrap: anywhere; }
	ul { font-size: var(--fs-sm); padding-left: var(--s-4); margin-bottom: var(--s-4); }
	label { display: grid; gap: var(--s-2); }
	input { padding: var(--s-2); border: 1px solid var(--border-strong); border-radius: var(--r-md); background: var(--surface); color: var(--text); }
	@media (max-width: 760px) { .routes { grid-template-columns: minmax(0, 1fr); } }
</style>
