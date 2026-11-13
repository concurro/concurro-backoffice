<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { IconType } from '#lib/meta.ts';

	interface Props extends HTMLButtonAttributes {
		variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'danger-solid';
		size?: 'sm' | 'md';
		icon?: IconType;
		href?: string;
		/** Navigate with a full page load (for backend routes such as sign-in). */
		reload?: boolean;
		/** Open an off-site `href` in a new tab. */
		external?: boolean;
		children?: Snippet;
	}
	let { variant = 'default', size = 'md', icon, href, reload = false, external = false, children, type = 'button', ...rest }: Props = $props();
	const Icon = $derived(icon);
</script>

{#snippet content()}
	{#if Icon}<Icon size={size === 'sm' ? 13 : 14} aria-hidden="true" />{/if}
	{#if children}<span>{@render children()}</span>{/if}
{/snippet}

{#if href}
	<a
		class="btn {variant} {size}"
		{href}
		data-sveltekit-reload={reload || undefined}
		target={external ? '_blank' : undefined}
		rel={external ? 'noreferrer' : undefined}>{@render content()}</a
	>
{:else}
	<button class="btn {variant} {size}" {type} {...rest}>{@render content()}</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 32px;
		padding: 0 var(--s-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		background: var(--surface);
		color: var(--text);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
		white-space: nowrap;
		cursor: pointer;
		text-decoration: none;
		transition:
			background var(--dur) var(--ease),
			border-color var(--dur) var(--ease);
	}
	.btn:hover {
		background: var(--surface-2);
		text-decoration: none;
	}
	.sm {
		height: 26px;
		padding: 0 var(--s-2);
		font-size: var(--fs-xs);
	}
	.primary {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}
	.primary:hover {
		border-color: var(--accent-hover);
		background: var(--accent-hover);
	}
	.ghost {
		border-color: transparent;
		background: transparent;
		color: var(--text-2);
	}
	.ghost:hover {
		background: var(--surface-3);
		color: var(--text);
	}
	.danger {
		border-color: var(--danger-border);
		color: var(--danger-fg);
	}
	.danger:hover {
		background: var(--danger-bg);
	}
	.danger-solid {
		border-color: var(--danger-solid);
		background: var(--danger-solid);
		color: var(--on-accent);
	}
	.danger-solid:hover {
		border-color: var(--danger-hover);
		background: var(--danger-hover);
	}
	.btn:disabled {
		border-color: var(--border);
		background: var(--surface-2);
		color: var(--text-disabled);
		cursor: not-allowed;
	}
</style>
