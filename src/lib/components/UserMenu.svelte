<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { Check, HandCoins, KeyRound, LogOut, Monitor, Moon, Sun } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { actions, session } from '#lib/api/index.ts';
	import { withBase } from '#lib/paths.ts';
	import { theme, type ThemePref } from '#lib/state/theme.svelte.ts';
	import Avatar from './Avatar.svelte';

	const me = $derived(session.me);

	async function signOut() {
		await actions.signOut();
		goto(withBase('/signin'));
	}
	const themes = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor }
	] as const;
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="user-trigger" aria-label="User menu">
		<Avatar login={me.login} size={26} />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content class="user-menu" align="end" sideOffset={6}>
			<div class="menu-id">
				<strong>{me.name}</strong>
				<span>@{me.login}</span>
			</div>
			<DropdownMenu.Separator class="menu-sep" />
			<DropdownMenu.Group>
				<DropdownMenu.GroupHeading class="menu-heading">Theme</DropdownMenu.GroupHeading>
				<DropdownMenu.RadioGroup value={theme.pref} onValueChange={(v) => theme.set(v as ThemePref)}>
					{#each themes as t}
						<DropdownMenu.RadioItem value={t.value} class="menu-item" closeOnSelect={false}>
							{#snippet children({ checked })}
								<t.icon size={14} aria-hidden="true" />
								<span>{t.label}</span>
								{#if checked}<span class="menu-check"><Check size={14} aria-hidden="true" /></span>{/if}
							{/snippet}
						</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Group>
			<DropdownMenu.Separator class="menu-sep" />
			<DropdownMenu.Item class="menu-item" onSelect={() => goto(withBase('/me/credentials'))}><KeyRound size={14} aria-hidden="true" /><span>My credentials</span></DropdownMenu.Item>
			<DropdownMenu.Item class="menu-item" onSelect={() => goto(withBase('/me/sponsorships'))}><HandCoins size={14} aria-hidden="true" /><span>My sponsorships</span></DropdownMenu.Item>
			<DropdownMenu.Separator class="menu-sep" />
			<DropdownMenu.Item class="menu-item" onSelect={signOut}><LogOut size={14} aria-hidden="true" /><span>Sign out</span></DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
	:global(.user-trigger) {
		display: flex;
		padding: 2px;
		border: 0;
		border-radius: 50%;
		background: none;
		cursor: pointer;
	}
	:global(.user-menu) {
		z-index: 50;
		min-width: 216px;
		padding: var(--s-1);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-lg);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-pop);
	}
	.menu-id {
		display: grid;
		padding: var(--s-2) var(--s-2) var(--s-1);
		font-size: var(--fs-sm);
	}
	.menu-id span {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	:global(.menu-sep) {
		height: 1px;
		margin: var(--s-1) 0;
		background: var(--border);
	}
	:global(.menu-heading) {
		padding: var(--s-1) var(--s-2);
		color: var(--text-3);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	:global(.menu-item) {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		height: 30px;
		padding: 0 var(--s-2);
		border-radius: var(--r-sm);
		color: var(--text-2);
		font-size: var(--fs-sm);
		cursor: pointer;
		outline: none;
	}
	:global(.menu-item[data-highlighted]) {
		background: var(--surface-3);
		color: var(--text);
	}
	:global(.menu-check) {
		display: flex;
		margin-left: auto;
		color: var(--accent-text);
	}
</style>
