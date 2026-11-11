<script lang="ts">
	let { login, size = 20, label = false }: { login: string; size?: number; label?: boolean } = $props();
	const initials = $derived(login.slice(0, 2).toUpperCase());
</script>

<span class="wrap" title={label ? undefined : `@${login}`}>
	<span class="avatar" style:width="{size}px" style:height="{size}px" style:font-size="{Math.round(size * 0.42)}px" aria-hidden="true">{initials}</span>
	{#if label}<span class="login">{login}</span>{:else}<span class="sr-only">@{login}</span>{/if}
</span>

<style>
	.wrap {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		vertical-align: middle;
	}
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		border: 1px solid var(--border-strong);
		border-radius: 50%;
		background: var(--surface-3);
		color: var(--text-2);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.02em;
	}
	.login {
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
</style>
