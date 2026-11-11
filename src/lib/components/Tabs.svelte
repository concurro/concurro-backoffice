<script lang="ts">
	import { Tabs } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Tab {
		value: string;
		label: string;
		count?: number;
	}
	let { tabs, value = $bindable(), children }: { tabs: Tab[]; value: string; children: Snippet } = $props();
</script>

<Tabs.Root bind:value>
	<Tabs.List class="tabs-list">
		{#each tabs as tab (tab.value)}
			<Tabs.Trigger value={tab.value} class="tabs-trigger">
				{tab.label}{#if tab.count !== undefined}<span class="tabs-count">{tab.count}</span>{/if}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
	<Tabs.Content {value} class="tabs-content">{@render children()}</Tabs.Content>
</Tabs.Root>

<style>
	:global(.tabs-list) {
		display: flex;
		gap: var(--s-1);
		overflow-x: auto;
		border-bottom: 1px solid var(--border);
		scrollbar-width: none;
	}
	:global(.tabs-trigger) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: var(--s-2) var(--s-3);
		margin-bottom: -1px;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--text-2);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
		white-space: nowrap;
		cursor: pointer;
	}
	:global(.tabs-trigger:hover) {
		color: var(--text);
	}
	:global(.tabs-trigger[data-state='active']) {
		border-bottom-color: var(--accent);
		color: var(--text);
	}
	:global(.tabs-count) {
		padding: 0 6px;
		border-radius: var(--r-full);
		background: var(--surface-3);
		color: var(--text-2);
		font-size: var(--fs-2xs);
		font-variant-numeric: tabular-nums;
	}
	:global(.tabs-content) {
		padding-top: var(--s-4);
	}
	:global(.tabs-content:focus-visible) {
		outline-offset: 4px;
	}
</style>
