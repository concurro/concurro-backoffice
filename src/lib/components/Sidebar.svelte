<script lang="ts">
	import { HandCoins, KeyRound, LayoutDashboard, Palette, PanelLeft, ServerCog, Target as TargetIcon } from 'lucide-svelte';
	import { page } from '$app/state';
	import type { IconType } from '#lib/meta.ts';
	import { session } from '#lib/api/index.ts';
	import { appPath, withBase } from '#lib/paths.ts';
	import { toggleSidebar, ui } from '#lib/state/ui.svelte.ts';

	interface Item {
		href: string;
		label: string;
		icon: IconType;
		mono?: boolean;
	}
	const i = (href: string, label: string, icon: IconType, mono = false): Item => ({ href, label, icon, mono });

	const groups = $derived<{ label?: string; items: Item[] }[]>([
		{ items: [i('/', 'Overview', LayoutDashboard)] },
		{ label: 'Targets', items: session.targets.map((t) => i(`/targets/${t.owner}/${t.repo}`, `${t.owner}/${t.repo}`, TargetIcon, true)) },
		{ label: 'Me', items: [i('/me/credentials', 'My credentials', KeyRound), i('/me/sponsorships', 'My sponsorships', HandCoins)] },
		{ label: 'Admin', items: [i('/admin', 'Operator', ServerCog), i('/styleguide', 'Styleguide', Palette)] }
	]);

	const path = $derived(appPath(page.url.pathname));
	function active(href: string): boolean {
		if (href === '/') return path === '/';
		// A task belongs to its target's nav entry.
		return path.startsWith(href) || path.startsWith(href.replace('/targets/', '/tasks/'));
	}
</script>

<nav class="sidebar" class:collapsed={ui.sidebarCollapsed} class:open={ui.mobileNavOpen} aria-label="Primary">
	<a class="brand" href={withBase('/')} aria-label="Concurro overview">
		<span class="logo" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="22" height="22"><rect width="24" height="24" rx="6" fill="var(--accent)" /><path d="M15.5 8.5a5 5 0 1 0 0 7" fill="none" stroke="var(--on-accent)" stroke-width="2.2" stroke-linecap="round" /></svg>
		</span>
		<span class="name">Concurro</span>
	</a>

	<div class="groups">
		{#each groups as group}
			<div class="group">
				{#if group.label}<p class="heading">{group.label}</p>{/if}
				{#each group.items as item}
					{@const Icon = item.icon}
					<a href={withBase(item.href)} class="item" class:active={active(item.href)} aria-current={active(item.href) ? 'page' : undefined} title={ui.sidebarCollapsed ? item.label : undefined} onclick={() => (ui.mobileNavOpen = false)}>
						<Icon size={16} aria-hidden="true" />
						<span class="label" class:mono={item.mono}>{item.label}</span>
					</a>
				{/each}
			</div>
		{/each}
	</div>

	<button class="item collapse" onclick={toggleSidebar} aria-pressed={ui.sidebarCollapsed} title={ui.sidebarCollapsed ? 'Expand sidebar' : undefined}>
		<PanelLeft size={16} aria-hidden="true" />
		<span class="label">Collapse</span>
	</button>
</nav>
{#if ui.mobileNavOpen}<button class="scrim" aria-label="Close navigation" onclick={() => (ui.mobileNavOpen = false)}></button>{/if}

<style>
	.sidebar {
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		flex: none;
		width: var(--sidebar-w);
		height: 100dvh;
		padding: var(--s-2);
		border-right: 1px solid var(--border);
		background: var(--surface);
		transition: width var(--dur) var(--ease);
		z-index: 30;
	}
	.collapsed {
		width: var(--sidebar-w-collapsed);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		height: calc(var(--topbar-h) - var(--s-2));
		padding: 0 9px;
		margin-bottom: var(--s-2);
		color: var(--text);
		font-weight: var(--fw-semibold);
		letter-spacing: -0.01em;
	}
	.brand:hover {
		text-decoration: none;
	}
	.logo {
		display: flex;
		flex: none;
	}
	.groups {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}
	.group {
		display: grid;
		gap: 1px;
		margin-bottom: var(--s-4);
	}
	.heading {
		padding: 0 10px;
		margin-bottom: var(--s-1);
		color: var(--text-3);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 32px;
		padding: 0 11px;
		border: 0;
		border-radius: var(--r-md);
		background: none;
		color: var(--text-2);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
		white-space: nowrap;
		cursor: pointer;
		text-align: left;
	}
	.item :global(svg) {
		flex: none;
	}
	.item:hover {
		background: var(--surface-3);
		color: var(--text);
		text-decoration: none;
	}
	.item.active {
		background: var(--accent-soft);
		color: var(--accent-text);
	}
	.label {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.label.mono {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
	}
	.collapsed .label,
	.collapsed .name,
	.collapsed .heading {
		display: none;
	}
	.collapsed .group {
		padding-top: var(--s-2);
		border-top: 1px solid var(--border);
	}
	.collapsed .group:first-child {
		border-top: 0;
	}
	.scrim {
		display: none;
	}
	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			left: 0;
			width: var(--sidebar-w);
			transform: translateX(-100%);
			transition: transform var(--dur) var(--ease);
			box-shadow: var(--shadow-overlay);
		}
		.sidebar.open {
			transform: none;
		}
		.sidebar .label,
		.sidebar .name,
		.sidebar .heading {
			display: revert;
		}
		.collapse {
			display: none;
		}
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 29;
			border: 0;
			background: var(--overlay-scrim);
		}
	}
</style>
