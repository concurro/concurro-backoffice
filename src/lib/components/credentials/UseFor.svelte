<script lang="ts">
	import { sameProfile, type ProfileOption } from '#lib/credentials.ts';
	import type { ProfileFilter } from '#lib/types.ts';

	interface Props {
		roles: string[];
		profiles: ProfileFilter[];
		roleOptions: { key: string; label: string }[];
		profileOptions: ProfileOption[];
	}
	let { roles = $bindable(), profiles = $bindable(), roleOptions, profileOptions }: Props = $props();
	/** Open at first when the entry is filtered; clearing every box must not close it mid-edit. */
	let open = $state(roles.length + profiles.length > 0);
	const targets = $derived([...new Set(profileOptions.map((option) => option.target))]);

	function toggleRole(key: string, on: boolean) {
		roles = on ? roleOptions.map((role) => role.key).filter((k) => k === key || roles.includes(k)) : roles.filter((k) => k !== key);
	}
	function toggleProfile(option: ProfileFilter, on: boolean) {
		const rest = profiles.filter((filter) => !sameProfile(filter, option));
		profiles = on ? [...rest, { target: option.target, profile: option.profile }] : rest;
	}
</script>

<details class="use-for" bind:open>
	<summary>Use for… <span class="muted">{roles.length + profiles.length ? 'selected work only' : 'all work'}</span></summary>
	<p class="hint">Leave a group empty to use this credential for all of it.</p>
	<fieldset>
		<legend>Roles</legend>
		{#each roleOptions as role (role.key)}
			<label><input type="checkbox" checked={roles.includes(role.key)} onchange={(event) => toggleRole(role.key, event.currentTarget.checked)} />{role.label}</label>
		{/each}
	</fieldset>
	<fieldset>
		<legend>Model profiles</legend>
		{#each targets as target (target)}
			<p class="target mono">{target}</p>
			{#each profileOptions.filter((option) => option.target === target) as option (option.profile)}
				<label>
					<input type="checkbox" checked={profiles.some((filter) => sameProfile(filter, option))} onchange={(event) => toggleProfile(option, event.currentTarget.checked)} />
					<span class="mono">{option.profile}</span>
					<span class="muted">{option.model ?? 'unavailable; matches nothing until it returns'}</span>
				</label>
			{/each}
		{:else}
			<p class="hint">No model profiles for this provider are visible to you.</p>
		{/each}
	</fieldset>
</details>

<style>
	.use-for { border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--s-2) var(--s-3); font-size: var(--fs-sm); }
	summary { cursor: pointer; font-weight: var(--fw-medium); }
	summary .muted { font-weight: var(--fw-regular); font-size: var(--fs-xs); margin-left: var(--s-1); }
	fieldset { display: grid; gap: var(--s-1); margin: var(--s-3) 0 0; padding: 0; border: 0; }
	legend { padding: 0; margin-bottom: var(--s-1); font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--text-2); }
	label { display: flex; align-items: baseline; gap: var(--s-2); flex-wrap: wrap; }
	.hint, .target { margin: var(--s-2) 0 0; font-size: var(--fs-xs); color: var(--text-2); }
</style>
