<script lang="ts">
	import { api, ApiError } from '#lib/api/index.ts';
	import { routeList } from '#lib/relays.ts';
	import type { RelayPending } from '#lib/types.ts';

	/** A displayed Sponsor code, looked up once complete to show what it registered. */
	let { code = $bindable(''), found = $bindable(null), label = 'Code' }: { code?: string; found?: RelayPending | null; label?: string } = $props();
	let failure = $state('');
	const normalized = $derived(code.trim().toUpperCase());

	$effect(() => {
		const value = normalized;
		found = null;
		failure = '';
		if (!/^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/.test(value)) return;
		let current = true;
		api.pendingRelay(value).then(
			(pending) => { if (current) found = pending; },
			(error) => {
				if (current) failure = error instanceof ApiError && error.status === 404 ? 'No pending Sponsor has this code. Codes expire after 10 minutes.' : 'The code could not be checked. Try again.';
			}
		);
		return () => { current = false; };
	});
</script>

<label>{label}<input required autocomplete="off" maxlength="9" placeholder="BCDF-GHJK" bind:value={code} /></label>
{#if found}
	<p class="found"><span>Device</span>{found.name} · {routeList(found.routes)}</p>
{:else if failure}
	<p class="failure" role="alert">{failure}</p>
{/if}

<style>
	label { display: grid; gap: var(--s-2); font-size: var(--fs-sm); }
	input { padding: var(--s-2); border: 1px solid var(--border-strong); border-radius: var(--r-md); background: var(--surface); color: var(--text); font-family: var(--font-mono); }
	p { margin: 0; font-size: var(--fs-sm); }
	.found { display: grid; gap: var(--s-1); }
	.found span { font-size: var(--fs-xs); color: var(--text-2); }
	.failure { color: var(--danger-fg); }
</style>
