<script lang="ts">
	import type { Resource } from '#lib/api/cache.svelte.ts';
	import { relTime } from '#lib/format.ts';
	import type { ReadFreshness } from '#lib/types.ts';
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';

	/** Says when a view shows data the API saved earlier, and reloads it while a refresh or a command's effect is pending. */
	let { resource, label }: { resource: Resource<{ cache?: ReadFreshness }>; label: string } = $props();
	const saved = $derived(resource.value?.cache);
	const checking = $derived(resource.loading || (saved?.refreshing && !resource.error));
	$effect(() => {
		if ((saved?.refreshing || (saved?.pendingCommand && !saved.error)) && !resource.loading && !resource.error) {
			const timer = setTimeout(resource.refresh, saved?.refreshing ? 1000 : 5000);
			return () => clearTimeout(timer);
		}
	});
</script>

{#if saved?.error}
	<Alert tone="caution" title="Showing saved {label} data">
		{saved.error} Saved data last verified {relTime(saved.observedAt)}.
		{#snippet actions()}
			<Button size="sm" onclick={resource.refresh} disabled={checking}>
				{checking ? 'Checking…' : 'Check for updates'}
			</Button>
		{/snippet}
	</Alert>
{:else if saved?.pendingCommand}
	<p class="muted" role="status">Command sent. Waiting for the {label} to update…</p>
{:else if saved?.refreshing}
	<p class="muted" role="status">Refreshing {label}… Showing the snapshot from {relTime(saved.observedAt)}.</p>
{/if}
