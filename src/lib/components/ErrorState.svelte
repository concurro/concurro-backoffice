<script lang="ts">
	import { RefreshCw } from 'lucide-svelte';
	import { refreshAll } from '$app/navigation';
	import Alert from './Alert.svelte';
	import Button from './Button.svelte';

	let { error }: { error: unknown } = $props();
	const message = $derived(error instanceof Error ? error.message : 'The request failed.');
</script>

<Alert tone="caution" title="This view could not be loaded">
	{message}
	{#snippet actions()}
		<Button size="sm" icon={RefreshCw} onclick={() => refreshAll()}>Retry</Button>
		<Button size="sm" variant="ghost" href="/">Overview</Button>
	{/snippet}
</Alert>
