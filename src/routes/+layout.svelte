<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/jetbrains-mono';
	import '#lib/styles/tokens.css';
	import '#lib/styles/base.css';
	import '#lib/state/theme.svelte.ts';
	import Toasts from '#lib/components/Toasts.svelte';

	let { children } = $props();
</script>

{@render children()}
<Toasts />
