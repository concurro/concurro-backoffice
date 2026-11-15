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
	import { actions, ApiError, MOCK } from '#lib/api/index.ts';
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
    let accountId = $state('');
	let saving = $state(false);
	$effect(() => { if (!editOpen) { secret = ''; accountId = ''; } });

	/** Start a write-only replacement without retaining a previous form value. */
	function edit(route: CredentialRoute) {
        editing = route; secret = ''; accountId = '';
        editOpen = true;
    }
	/** Save the supplied credential and refresh its stored status. */
	async function save() {
		if (!editing || saving) return;
		saving = true;
		try {
			await actions.saveCredential(editing.id, secret, editing.id === 'chatgpt_subscription' ? { account_id: accountId } : {});
			editOpen = false;
			toast(`${editing.label} saved`);
			await invalidateAll();
		 } catch (error) {
            const unknown = !(error instanceof ApiError) || error.status >= 500;
            toast(unknown ? 'Save outcome unknown. Checking current credential status.' : error.message, 'danger');
            await invalidateAll().catch(() => {});
        }
		finally { secret = ''; accountId = ''; saving = false; }
	}
	/** Revoke only this user's personal route; org-paid sessions remain unchanged. */
	async function revoke() {
		if (!revoking) return;
		try { await actions.revokeCredential(revoking.id); revokeOpen = false; toast(`${revoking.label} revoked`, 'warning'); await invalidateAll(); }
		catch (error) { toast(error instanceof Error ? error.message : 'The credential could not be revoked.', 'danger'); }
	}
	/** Show whether a credential is stored for the configured route; execution checks model access. */
	function coverage(requirement: CredentialRequirement, routes: CredentialRoute[]): string {
		if (!requirement.route) return 'route not configured';
		const record = routes.find((r) => r.route === requirement.route);
		if (!record || record.status !== 'valid') return record?.status ?? 'missing';
		return 'credential saved';
	}
</script>

<svelte:head><title>My credentials · Concurro</title></svelte:head>
<PageHeader title="My credentials" subtitle="Write-only personal credentials for provider sponsorship. Issues select organization or personal credentials separately for each provider. Admitted calls retain their exact credential versions." />
{#await data.result}<Skeleton rows={8} />{:then { routes, targets }}
	<div class="routes">
		{#each routes as route (route.id)}
			<article class="route">
				<header><div><h2>{route.label}</h2><p class="muted">{route.provider} · {route.kind}</p></div><Badge meta={credentialMeta[route.status]} /></header>
				<dl>
					<div><dt>Fingerprint</dt><dd class="mono">{route.fingerprint ?? '—'}</dd></div>
					<div><dt>Updated</dt><dd>{route.lastUpdated ? relTime(route.lastUpdated) : 'unknown'}</dd></div>
					<div><dt>Last resolved</dt><dd>{route.lastUsed ? relTime(route.lastUsed) : 'never / unknown'}</dd></div>
					<div><dt>Expiry</dt><dd>{route.expiryKnown && route.expiresAt ? route.expiresAt : 'unknown'}</dd></div>
                    {#if route.accountLabel}<div><dt>Account</dt><dd>{route.accountLabel} · {route.accountVerified ? 'identity verified' : 'identity not independently verified'}</dd></div>{/if}
				</dl>
				{#if route.note}<p class="note">{route.note}</p>{/if}
                {#if route.kind === 'Subscription'}
                    <details><summary>Connect with your local CLI</summary>
                        {#if route.id === 'chatgpt_subscription'}<p>Run <code>codex login --device-auth</code> locally. Use your existing local token-retrieval procedure, then paste only the issued access token and ChatGPT account ID here. Login does not export a token. <a href="https://developers.openai.com/codex/auth/" target="_blank" rel="noreferrer">Official login guidance</a></p>
                        {:else}<p>Run <code>claude setup-token</code> locally and copy its printed token after browser login. You can also use the subscription token from your existing <code>claude auth login --claudeai</code> procedure. This is CLI/browser login. <a href="https://code.claude.com/docs/en/authentication" target="_blank" rel="noreferrer">Official login guidance</a></p>{/if}
                        <p>Never paste a whole credential file or refresh token. Expiry stays unknown unless trustworthy evidence supplies it. Sign in locally and replace an expired or rejected token; eligible credential pauses are reconsidered automatically after saving a replacement. Other pauses need a writer. Replacement does not reset budgets or transfer sponsorship.</p>
                    </details>
                {/if}
				<footer><Button size="sm" icon={KeyRound} disabled={!route.registrationAvailable || saving} onclick={() => edit(route)}>{route.fingerprint ? 'Replace' : 'Add'}</Button>{#if route.fingerprint && route.status !== 'revoked'}<Button size="sm" variant="danger" onclick={() => { revoking = route; revokeOpen = true; }}>Revoke</Button>{/if}</footer>
			</article>
		{/each}
	</div>
	<Panel title="Configured route coverage" meta="selected routes · funding follows task policy">
		{#each targets as target}
			<h3>{target.owner}/{target.repo}</h3>
			{#if target.credentialRequirements?.length}<ul>{#each target.credentialRequirements as requirement}<li><span class="mono">{requirement.profile}</span> · {requirement.role.replaceAll('_', ' ')} · {requirement.route ?? 'no configured route'} · {requirement.model} · <strong>{coverage(requirement, routes)}</strong></li>{/each}</ul>{:else}<p class="muted">Configured route requirements are unavailable; coverage is unknown.</p>{/if}
		{/each}
	</Panel>
{:catch error}<ErrorState {error} />{/await}

<Modal bind:open={editOpen} title="{editing?.fingerprint ? 'Replace' : 'Add'} {editing?.label ?? ''}" description="Save this credential without contacting the provider. Token and model-access problems are reported during execution. Replacing it retires the previous version.">
    <form id="credential" onsubmit={(event) => { event.preventDefault(); save(); }}>
        <label>{editing?.kind === 'Subscription' ? 'CLI access token' : 'API key'}<input type="password" autocomplete="off" required bind:value={secret} /></label>
        {#if editing?.id === 'chatgpt_subscription'}<label>ChatGPT account ID<input autocomplete="off" required bind:value={accountId} /></label><p class="note">Stored with this exact token version. This supplied account ID is not independently verified.</p>{/if}
        <p class="note">The credential and account input are cleared after every attempt or when this dialog closes. They are never stored in this browser or readable here later.</p>
    </form>
    {#if MOCK}<Alert tone="note" title="Mock mode">Synthetic storage only. Nothing leaves this browser tab.</Alert>{/if}
    {#snippet footer()}<Button onclick={() => editOpen = false}>Cancel</Button><Button type="submit" form="credential" variant="primary" disabled={saving || !secret || (editing?.id === 'chatgpt_subscription' && !accountId)} icon={saving ? LoaderCircle : undefined}>{saving ? 'Saving…' : 'Save'}</Button>{/snippet}
</Modal>
<Modal bind:open={revokeOpen} title="Revoke {revoking?.label ?? ''}?" description="Deletes this stored personal secret. Your sponsorship remains visible with missing coverage. Sessions using this personal version retire; organization-funded sessions are unaffected. It does not revoke the key at the provider.">
	{#snippet footer()}<Button onclick={() => revokeOpen = false}>Cancel</Button><Button variant="danger-solid" onclick={revoke}>Revoke stored credential</Button>{/snippet}
</Modal>
<style>
	.routes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-3); }
	.route { display: grid; gap: var(--s-3); padding: var(--s-4); border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); }
	header, footer { display: flex; gap: var(--s-2); justify-content: space-between; flex-wrap: wrap; }
	dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-2); margin: 0; font-size: var(--fs-sm); }
	dt, .note { font-size: var(--fs-xs); color: var(--text-2); }
	dd { margin: 0; overflow-wrap: anywhere; }
	ul { font-size: var(--fs-sm); padding-left: var(--s-4); margin-bottom: var(--s-4); }
	form { display: grid; gap: var(--s-3); }
    details { font-size: var(--fs-xs); color: var(--text-2); }
    details p { margin-top: var(--s-2); }
    label { display: grid; gap: var(--s-2); }
	input { padding: var(--s-2); border: 1px solid var(--border-strong); border-radius: var(--r-md); background: var(--surface); color: var(--text); }
	@media (max-width: 760px) { .routes { grid-template-columns: minmax(0, 1fr); } }
</style>
