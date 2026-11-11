<script lang="ts">
	import CommandPalette from '#lib/components/CommandPalette.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import Topbar from '#lib/components/Topbar.svelte';

	let { children } = $props();
</script>

<a class="skip" href="#main">Skip to content</a>
<div class="shell">
	<Sidebar />
	<div class="column">
		<Topbar />
		<main id="main">{@render children()}</main>
	</div>
</div>
<CommandPalette />

<style>
	.shell {
		display: flex;
		min-height: 100dvh;
	}
	.column {
		flex: 1;
		min-width: 0;
	}
	main {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--s-5);
		align-content: start;
		max-width: var(--content-max);
		margin: 0 auto;
		padding: var(--s-5);
	}
	.skip {
		position: absolute;
		left: var(--s-2);
		top: -40px;
		z-index: 100;
		padding: var(--s-2) var(--s-3);
		border-radius: var(--r-md);
		background: var(--accent);
		color: var(--on-accent);
	}
	.skip:focus {
		top: var(--s-2);
	}
	@media (max-width: 768px) {
		main {
			padding: var(--s-4) var(--s-3);
			gap: var(--s-4);
		}
	}
</style>
