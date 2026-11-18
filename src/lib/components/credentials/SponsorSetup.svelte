<script lang="ts">
	import { Copy, Download } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { RelaySetup } from '#lib/types.ts';

	/** Install and launch steps for Sponsor, using only what this deployment configures. */
	let { open = $bindable(false), setup, onapprove }: { open?: boolean; setup: RelaySetup | null; onapprove: () => void } = $props();
	const command = $derived(setup?.command ?? '');

	async function copy() {
		try {
			await navigator.clipboard.writeText(command);
			toast('Command copied');
		} catch {
			toast('Copy failed; select the command instead.', 'warning');
		}
	}
</script>

<Modal bind:open title="Set up Sponsor" description="Sponsor runs on your machine and keeps your Claude or ChatGPT login there.">
	{#if !setup}
		<Alert tone="warning" title="Setup details unavailable">They could not be loaded. Try again later.</Alert>
	{:else}
		<ol>
			<li>
				<h3>Install</h3>
				{#if setup.download}
					<Button href={setup.download} external icon={Download}>Download Sponsor</Button>
				{:else}
					<p>Sponsor is not available to download here yet. Ask whoever runs this Concurro for a package.</p>
				{/if}
			</li>
			<li>
				<h3>Start</h3>
				{#if command}
					<div class="command"><CodeBlock text={command} /><Button size="sm" icon={Copy} onclick={copy}>Copy</Button></div>
					<p>Sign in to Claude, ChatGPT or both when asked. Add <code>--links 2</code> to serve two tasks at once.</p>
				{:else}
					<Alert tone="warning" title="Sponsor connections are not set up">This Concurro has no address for Sponsor yet. Ask whoever runs it.</Alert>
				{/if}
			</li>
			<li>
				<h3>Approve</h3>
				<p>Sponsor shows a code. Enter it here to approve this device.</p>
			</li>
		</ol>
	{/if}
	{#snippet footer()}<Button onclick={() => (open = false)}>Close</Button><Button variant="primary" onclick={onapprove}>Enter code</Button>{/snippet}
</Modal>

<style>
	/* Items may shrink below the command's width, so only the command scrolls. */
	ol { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--s-4); margin: 0 0 var(--s-3); padding-left: var(--s-5); }
	li { min-width: 0; }
	h3 { margin: 0 0 var(--s-2); font-size: var(--fs-sm); font-weight: var(--fw-semibold); }
	p { margin: var(--s-2) 0 0; font-size: var(--fs-sm); color: var(--text-2); }
	code { font-family: var(--font-mono); font-size: var(--fs-xs); }
	.command { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--s-2); }
</style>
