<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { X } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		children?: Snippet;
		footer?: Snippet;
	}
	let { open = $bindable(), title, description, children, footer }: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="modal-overlay" />
		<Dialog.Content class="modal">
			<header>
				<div>
					<Dialog.Title class="modal-title">{title}</Dialog.Title>
					{#if description}<Dialog.Description class="modal-desc">{description}</Dialog.Description>{/if}
				</div>
				<Dialog.Close class="modal-close" aria-label="Close"><X size={16} /></Dialog.Close>
			</header>
			{#if children}<div class="content">{@render children()}</div>{/if}
			{#if footer}<footer>{@render footer()}</footer>{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.modal-overlay) {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: var(--overlay-scrim);
		animation: modal-fade var(--dur) var(--ease);
	}
	:global(.modal) {
		position: fixed;
		top: 14vh;
		left: 50%;
		z-index: 41;
		width: min(520px, calc(100vw - 2 * var(--s-4)));
		max-height: 76vh;
		overflow: auto;
		transform: translateX(-50%);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-lg);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-overlay);
		animation: modal-in var(--dur) var(--ease);
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--s-4);
		padding: var(--s-4) var(--s-4) 0;
	}
	:global(.modal-title) {
		margin: 0;
		font-size: var(--fs-lg);
		font-weight: var(--fw-semibold);
	}
	:global(.modal-desc) {
		margin: 4px 0 0;
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	:global(.modal-close) {
		display: flex;
		padding: 4px;
		border: 0;
		border-radius: var(--r-sm);
		background: none;
		color: var(--text-3);
		cursor: pointer;
	}
	:global(.modal-close:hover) {
		background: var(--surface-3);
	}
	.content {
		padding: var(--s-4);
	}
	footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--s-2);
		padding: var(--s-3) var(--s-4);
		border-top: 1px solid var(--border);
		background: var(--surface-2);
		border-radius: 0 0 var(--r-lg) var(--r-lg);
	}
	@keyframes -global-modal-fade {
		from {
			opacity: 0;
		}
	}
	@keyframes -global-modal-in {
		from {
			opacity: 0;
			transform: translate(-50%, 6px);
		}
	}
</style>
