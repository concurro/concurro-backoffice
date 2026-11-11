<script lang="ts">
	import { Command, Dialog } from 'bits-ui';
	import { CircleDot, CornerDownLeft, HandCoins, KeyRound, LayoutDashboard, Palette, Search, ServerCog, Target } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { targetHref, taskHref } from '#lib/format.ts';
	import { taskStageMeta } from '#lib/meta.ts';
	import { api } from '#lib/api/index.ts';
	import { withBase } from '#lib/paths.ts';
	import { ui } from '#lib/state/ui.svelte.ts';

	const pages = [
		{ href: withBase('/'), label: 'Overview', icon: LayoutDashboard },
		{ href: withBase('/me/credentials'), label: 'My credentials', icon: KeyRound },
		{ href: withBase('/me/sponsorships'), label: 'My sponsorships', icon: HandCoins },
		{ href: withBase('/admin'), label: 'Operator', icon: ServerCog },
		{ href: withBase('/styleguide'), label: 'Styleguide', icon: Palette }
	];
	const index = $derived(ui.paletteOpen ? api.index() : { targets: [], tasks: [] });

	/** Every search term must appear in the item's value or keywords. */
	function filter(value: string, search: string, keywords: string[] = []): number {
		const hay = [value, ...keywords].join(" ").toLowerCase();
		return search.toLowerCase().split(/\s+/).every((term) => hay.includes(term)) ? 1 : 0;
	}

	function go(href: string) {
		ui.paletteOpen = false;
		goto(href);
	}

	function onkeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			ui.paletteOpen = !ui.paletteOpen;
		}
	}
</script>

<svelte:window {onkeydown} />

<Dialog.Root bind:open={ui.paletteOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="modal-overlay" />
		<Dialog.Content class="palette" aria-label="Command palette">
			<Dialog.Title class="sr-only">Command palette</Dialog.Title>
			<Command.Root class="palette-root" loop {filter}>
				<div class="palette-input">
					<Search size={16} aria-hidden="true" />
					<Command.Input placeholder="Jump to a target, task or issue number…" aria-label="Search" />
					<kbd>esc</kbd>
				</div>
				<Command.List class="palette-list">
					<Command.Viewport>
						<Command.Empty class="palette-empty">No matches. Try an issue number or a repository name.</Command.Empty>
						<Command.Group>
							<Command.GroupHeading class="palette-heading">Tasks</Command.GroupHeading>
							<Command.GroupItems>
								{#each index.tasks as task (taskHref(task))}
									{@const meta = taskStageMeta(task)}
									<Command.Item class="palette-item" value={taskHref(task)} keywords={[`#${task.issue}`, String(task.issue), task.title, task.repo, task.stage, meta.label]} onSelect={() => go(taskHref(task))}>
										<CircleDot size={14} aria-hidden="true" />
										<span class="palette-ref">{task.repo}#{task.issue}</span>
										<span class="palette-title">{task.title}</span>
										<span class="palette-meta">{meta.label}</span>
									</Command.Item>
								{/each}
							</Command.GroupItems>
						</Command.Group>
						<Command.Group>
							<Command.GroupHeading class="palette-heading">Targets</Command.GroupHeading>
							<Command.GroupItems>
								{#each index.targets as target (targetHref(target))}
									<Command.Item class="palette-item" value={targetHref(target)} keywords={[target.owner, target.repo, target.mode]} onSelect={() => go(targetHref(target))}>
										<Target size={14} aria-hidden="true" />
										<span class="palette-ref">{target.owner}/{target.repo}</span>
										<span class="palette-title">{target.description}</span>
										<span class="palette-meta">{target.mode}</span>
									</Command.Item>
								{/each}
							</Command.GroupItems>
						</Command.Group>
						<Command.Group>
							<Command.GroupHeading class="palette-heading">Pages</Command.GroupHeading>
							<Command.GroupItems>
								{#each pages as p (p.href)}
									<Command.Item class="palette-item" value={p.href} keywords={[p.label]} onSelect={() => go(p.href)}>
										<p.icon size={14} aria-hidden="true" />
										<span class="palette-title strong">{p.label}</span>
									</Command.Item>
								{/each}
							</Command.GroupItems>
						</Command.Group>
					</Command.Viewport>
				</Command.List>
				<div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><CornerDownLeft size={12} aria-hidden="true" /> open</span></div>
			</Command.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.palette) {
		position: fixed;
		top: 12vh;
		left: 50%;
		z-index: 41;
		width: min(640px, calc(100vw - 2 * var(--s-4)));
		transform: translateX(-50%);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-lg);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-overlay);
		overflow: hidden;
		animation: modal-in var(--dur) var(--ease);
	}
	.palette-input {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		padding: 0 var(--s-3);
		border-bottom: 1px solid var(--border);
		color: var(--text-3);
	}
	.palette-input :global(input) {
		flex: 1;
		height: 44px;
		border: 0;
		outline: 0;
		background: none;
		color: var(--text);
		font-size: var(--fs-md);
	}
	.palette-input :global(input::placeholder) {
		color: var(--text-3);
	}
	:global(.palette-list) {
		max-height: min(52vh, 420px);
		overflow-y: auto;
		padding: var(--s-1);
	}
	:global(.palette-heading) {
		padding: var(--s-2) var(--s-2) var(--s-1);
		color: var(--text-3);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	:global(.palette-item) {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		height: 34px;
		padding: 0 var(--s-2);
		border-radius: var(--r-md);
		color: var(--text-2);
		font-size: var(--fs-sm);
		cursor: pointer;
	}
	:global(.palette-item > svg) {
		flex: none;
		color: var(--text-3);
	}
	:global(.palette-item[data-selected]) {
		background: var(--accent-soft);
		color: var(--text);
	}
	:global(.palette-ref) {
		flex: none;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		color: var(--text);
	}
	:global(.palette-title) {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.palette-title.strong) {
		color: var(--text);
	}
	:global(.palette-meta) {
		flex: none;
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	:global(.palette-empty) {
		padding: var(--s-5);
		color: var(--text-3);
		font-size: var(--fs-sm);
		text-align: center;
	}
	.palette-foot {
		display: flex;
		gap: var(--s-4);
		padding: var(--s-2) var(--s-3);
		border-top: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.palette-foot span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
</style>
