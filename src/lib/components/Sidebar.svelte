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

	/** Owner groups retain the target order supplied by the API. */
	const targetGroups = $derived.by(() => {
		const owners = new Map<string, Item[]>();
		for (const target of session.targets) {
			const items = owners.get(target.owner) ?? [];
			items.push(i(`/targets/${target.owner}/${target.repo}`, target.repo, TargetIcon, true));
			owners.set(target.owner, items);
		}
		return [...owners];
	});

	const groups = $derived<{ label?: string; items: Item[]; targets?: typeof targetGroups }[]>([
		{ items: [i('/', 'Overview', LayoutDashboard)] },
		{ label: 'Targets', items: [], targets: targetGroups },
		{ label: 'Me', items: [i('/me/credentials', 'My credentials', KeyRound), i('/me/sponsorships', 'My sponsorships', HandCoins)] },
		{ label: 'Admin', items: [i('/admin', 'Operator', ServerCog), i('/styleguide', 'Styleguide', Palette)] }
	]);

	const path = $derived(appPath(page.url.pathname));
	/** Match a navigation destination and its descendants on complete path segments. */
	function active(href: string): boolean {
		if (href === '/') return path === '/';
		// A task belongs to its target's nav entry.
		return [href, href.replace('/targets/', '/tasks/')].some((route) => path === route || path.startsWith(`${route}/`));
	}
</script>

<!-- Shared navigation link for ordinary items and grouped repositories. -->
{#snippet navItem(item: Item, name: string)}
	{@const Icon = item.icon}
	<a href={withBase(item.href)} class="item" class:target={item.mono} class:active={active(item.href)} aria-label={name} aria-current={active(item.href) ? 'page' : undefined} title={ui.sidebarCollapsed || item.mono ? name : undefined} onclick={() => (ui.mobileNavOpen = false)}>
		<Icon size={16} aria-hidden="true" />
		<span class="label" class:mono={item.mono}>{item.label}</span>
	</a>
{/snippet}

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
				{#if group.targets}
					<ul class="owners">
						{#each group.targets as [owner, items] (owner)}
							<li>
								<p class="owner-name" title={owner}>{owner}/</p>
								<ul class="repos" aria-label={`${owner} repositories`}>
									{#each items as item (item.href)}
										<li>{@render navItem(item, `${owner}/${item.label}`)}</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				{:else}
					{#each group.items as item}
						{@render navItem(item, item.label)}
					{/each}
				{/if}
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
	.owners,
	.repos {
		list-style: none;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.owners {
		display: grid;
		gap: var(--s-2);
	}
	.owner-name {
		padding: var(--s-1) 10px;
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		overflow-wrap: anywhere;
	}
	.repos {
		margin-left: var(--s-3);
		padding-left: var(--s-1);
		border-left: 1px solid var(--border);
	}
	.item.target {
		height: auto;
		min-height: 32px;
		padding-top: var(--s-1);
		padding-bottom: var(--s-1);
		white-space: normal;
	}
	.target .label {
		min-width: 0;
		overflow-wrap: anywhere;
		overflow: visible;
	}
	.collapsed .repos {
		margin-left: 0;
		padding-left: 0;
		border-left: 0;
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
	.collapsed .heading,
	.collapsed .owner-name {
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
		.sidebar .heading,
		.sidebar .owner-name {
			display: revert;
		}
		.sidebar .repos {
			margin-left: var(--s-3);
			padding-left: var(--s-1);
			border-left: 1px solid var(--border);
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
