<script lang="ts">
	import { GitFork, ShieldCheck } from 'lucide-svelte';
	import Button from '#lib/components/Button.svelte';
	import type { IconType } from '#lib/meta.ts';
</script>

<svelte:head><title>Sign in · Concurro</title></svelte:head>

<main>
	<div class="card">
		<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><rect width="24" height="24" rx="6" fill="var(--accent)" /><path d="M15.5 8.5a5 5 0 1 0 0 7" fill="none" stroke="var(--on-accent)" stroke-width="2.2" stroke-linecap="round" /></svg>
		<h1>Sign in to Concurro</h1>
		<p class="lead">From issue to reviewed pull request. Humans merge.</p>
		<Button variant="primary" icon={GitFork} href="/">Continue with GitHub</Button>
		<p class="fine"><ShieldCheck size={13} aria-hidden="true" /> Concurro reads your GitHub identity and repository permissions. It never merges on your behalf.</p>
	</div>
	<p class="foot">Self-hosted · engine <span class="mono">0f828d7</span></p>
</main>

<style>
	main {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--s-4);
		min-height: 100dvh;
		padding: var(--s-4);
	}
	.card {
		display: grid;
		justify-items: center;
		gap: var(--s-3);
		width: min(380px, 100%);
		padding: var(--s-6) var(--s-5);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
		text-align: center;
	}
	.card :global(.btn) {
		width: 100%;
		height: 38px;
		margin-top: var(--s-3);
	}
	.lead {
		color: var(--text-2);
	}
	.fine {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.fine :global(svg) {
		vertical-align: -2px;
	}
	.foot {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
</style>
