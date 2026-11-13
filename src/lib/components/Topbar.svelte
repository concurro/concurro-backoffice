<script lang="ts">
	import { ChevronRight, Menu, Search } from 'lucide-svelte';
	import { page } from '$app/state';
	import { withBase } from '#lib/paths.ts';
	import { ui } from '#lib/state/ui.svelte.ts';
	import UserMenu from './UserMenu.svelte';

	interface Crumb {
		label: string;
		href?: string;
		mono?: boolean;
	}

	const crumbs = $derived.by((): Crumb[] => {
		const { owner, repo, issue, turn } = page.params;
		const id = page.route.id ?? '';
		const target: Crumb = { label: `${owner}/${repo}`, href: withBase(`/targets/${owner}/${repo}`), mono: true };
		const task: Crumb = { label: `Issue #${issue}`, href: withBase(`/tasks/${owner}/${repo}/${issue}`) };
		if (id.includes('/turns')) return [target, task, { label: turn ? `Turn ${turn}` : 'Run diagnostics' }];
		if (id.includes('/issues/')) return [target, { label: `Issue #${issue}` }, { label: 'Provider consent' }];
		if (id.includes('/tasks/')) return [target, { label: task.label }];
		if (id.includes('/targets/')) return [{ label: 'Targets' }, { label: target.label, mono: true }];
		if (id.endsWith('/me/credentials')) return [{ label: 'Me' }, { label: 'Credentials' }];
		if (id.endsWith('/me/sponsorships')) return [{ label: 'Me' }, { label: 'Sponsorships' }];
		if (id.endsWith('/admin')) return [{ label: 'Admin' }, { label: 'Operator' }];
		if (id.endsWith('/styleguide')) return [{ label: 'Styleguide' }];
		return [{ label: 'Overview' }];
	});
</script>

<header class="topbar">
	<button class="icon-btn" onclick={() => (ui.mobileNavOpen = true)} aria-label="Open navigation"><Menu size={18} /></button>
	<nav aria-label="Breadcrumb">
		<ol>
			{#each crumbs as crumb, i}
				<li>
					{#if i}<ChevronRight size={14} aria-hidden="true" />{/if}
					{#if crumb.href}
						<a href={crumb.href} class:mono={crumb.mono}>{crumb.label}</a>
					{:else}
						<span class:mono={crumb.mono} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
	<button class="search" onclick={() => (ui.paletteOpen = true)} aria-label="Search (Command K)">
		<Search size={14} aria-hidden="true" />
		<span class="hint">Jump to target, task or issue</span>
		<kbd>⌘K</kbd>
	</button>
	<UserMenu />
</header>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: var(--s-3);
		height: var(--topbar-h);
		padding: 0 var(--s-5);
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}
	nav {
		flex: 1;
		min-width: 0;
	}
	ol {
		display: flex;
		align-items: center;
		gap: var(--s-1);
		margin: 0;
		padding: 0;
		list-style: none;
		overflow: hidden;
		font-size: var(--fs-sm);
	}
	li {
		display: flex;
		align-items: center;
		gap: var(--s-1);
		color: var(--text-3);
		white-space: nowrap;
		min-width: 0;
	}
	li:not(:last-child) {
		flex-shrink: 0;
	}
	li a {
		color: var(--text-2);
	}
	li span {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	li span[aria-current] {
		color: var(--text);
		font-weight: var(--fw-medium);
	}
	.mono {
		font-size: var(--fs-xs);
	}
	.search {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		height: 30px;
		padding: 0 var(--s-2);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--fs-sm);
		cursor: pointer;
	}
	.search:hover {
		border-color: var(--border-strong);
		color: var(--text-2);
	}
	.hint {
		min-width: 190px;
		text-align: left;
	}
	.icon-btn {
		display: none;
		padding: 4px;
		border: 0;
		border-radius: var(--r-sm);
		background: none;
		color: var(--text-2);
		cursor: pointer;
	}
	@media (max-width: 960px) {
		.hint {
			display: none;
		}
	}
	@media (max-width: 768px) {
		.topbar {
			padding: 0 var(--s-3);
		}
		.icon-btn {
			display: flex;
		}
		li:not(:last-child):not(:nth-last-child(2)) {
			display: none;
		}
	}
	@media (max-width: 480px) {
		.search kbd {
			display: none;
		}
	}
</style>
