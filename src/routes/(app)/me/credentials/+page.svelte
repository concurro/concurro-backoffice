<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { ChevronRight, Ellipsis, GripVertical, KeyRound, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-svelte';
	import { tick } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import TokenFields from '#lib/components/credentials/TokenFields.svelte';
	import UseFor from '#lib/components/credentials/UseFor.svelte';
	import { actions, ApiError, MOCK, session } from '#lib/api/index.ts';
	import { currentEntry, filterSummary, profileOptions } from '#lib/credentials.ts';
	import { relTime, taskHref } from '#lib/format.ts';
	import { credentialMeta } from '#lib/meta.ts';
	import { needsYou } from '#lib/needs-you.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { CredentialEntry, CredentialList, CredentialListing, CredentialType, CredentialTypeId, ProfileFilter, Target } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	/** The last listing read; kept on screen while a write reloads it. */
	let listing = $state<(CredentialListing & { targets: Target[] }) | null>(null);
	let failure = $state<unknown>(null);
	/** An order shown before the list that confirms it has been read again. */
	let preview = $state<{ provider: string; ids: string[] } | null>(null);
	let dragging = $state<{ list: CredentialList; entry: CredentialEntry } | null>(null);
	let busy = $state(false);
	let announcement = $state('');
	let expanded = $state<Record<string, boolean>>({});

	/** Show a listing that was read, and point open dialogs at its revisions; a dialog whose entry is gone closes. */
	function show(value: CredentialListing & { targets: Target[] }) {
		listing = value;
		failure = null;
		preview = null;
		const entries = value.providers.flatMap((list) => list.entries);
		const current = (entry: CredentialEntry | null, close: () => void) => {
			const found = entry && currentEntry(entries, entry);
			if (entry && !found) { close(); toast(`${entry.name} was removed elsewhere.`, 'warning'); }
			return found ?? null;
		};
		if (formOpen) form.entry = current(form.entry, () => (formOpen = false));
		if (replaceOpen) replacing = current(replacing, () => (replaceOpen = false));
		if (removeOpen) removing = current(removing, () => (removeOpen = false));
	}
	$effect(() => {
		data.result.then(show, (error) => { failure = error; });
	});

	const paused = $derived(needsYou(session.tasks).filter((item) => item.kind === 'credentials'));
	const typeOf = (id: CredentialTypeId) => listing!.types.find((type) => type.id === id)!;
	const ordered = (list: CredentialList) =>
		preview?.provider === list.provider ? preview.ids.flatMap((id) => list.entries.find((entry) => entry.id === id) ?? []) : list.entries;

	/** Run one write, then read the lists again; a stale or uncertain write is explained and reloaded the same way. */
	async function write(change: () => Promise<unknown>, done: string): Promise<boolean> {
		if (busy) return false;
		busy = true;
		try {
			await change();
			toast(done);
			return true;
		} catch (error) {
			const known = error instanceof ApiError && error.status < 500;
			const stale = error instanceof ApiError && (error.status === 409 || error.status === 410);
			toast(stale ? 'Your credentials changed elsewhere. The list was reloaded; try again.' : known ? error.message : 'Outcome unknown. Checking your current credentials.', 'danger');
			return false;
		} finally {
			// The next write is allowed only once the lists it will name have been read.
			await invalidateAll().then(() => data.result).then(show, () => {});
			busy = false;
		}
	}

	async function reorder(list: CredentialList, ids: string[], moved: CredentialEntry) {
		preview = { provider: list.provider, ids };
		const position = ids.indexOf(moved.id) + 1;
		if (await write(() => actions.reorderCredentials(list, ids), `${list.label} order saved`)) announcement = `${moved.name} is now ${position} of ${ids.length}.`;
		else preview = null;
	}
	/** The entry of `list` under a pointer position, if any. */
	function entryAt(list: CredentialList, x: number, y: number) {
		const id = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-entry]')?.dataset.entry;
		return list.entries.find((entry) => entry.id === id);
	}
	/** Reorder with the handle: drag it with a mouse, pen or finger, or press the arrow keys while it has focus. */
	const handle = (list: CredentialList, entry: CredentialEntry) => ({
		onpointerdown(event: PointerEvent) {
			if (busy || event.button !== 0) return;
			event.preventDefault();
			dragging = { list, entry };
		},
		onkeydown(event: KeyboardEvent) {
			const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
			const index = list.entries.indexOf(entry);
			if (!delta || busy || !list.entries[index + delta]) return;
			event.preventDefault();
			const ids = list.entries.map((item) => item.id);
			[ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
			// Moving the row drops focus; return it to this entry's handle for the next key press.
			reorder(list, ids, entry).then(tick).then(() => document.querySelector<HTMLElement>(`[data-entry="${entry.id}"] .grip`)?.focus());
		}
	});
	/** A drag is followed on the window, since reordering moves the handle itself. */
	function dragMove(event: PointerEvent) {
		if (!dragging) return;
		const { list, entry } = dragging;
		const over = entryAt(list, event.clientX, event.clientY);
		if (!over || over.id === entry.id) return;
		const ids = ordered(list).map((item) => item.id);
		ids.splice(ids.indexOf(over.id), 0, ...ids.splice(ids.indexOf(entry.id), 1));
		preview = { provider: list.provider, ids };
	}
	function dragEnd(commit: boolean) {
		if (!dragging) return;
		const { list, entry } = dragging;
		dragging = null;
		if (!commit || !preview || preview.ids.every((id, index) => list.entries[index].id === id)) preview = null;
		else reorder(list, preview.ids, entry);
	}

	const toggle = (entry: CredentialEntry) =>
		write(() => actions.editCredential(entry, { enabled: !entry.enabled }), `${entry.name} ${entry.enabled ? 'disabled' : 'enabled'}`);

	/** The entry dialog: a new entry with its token, or the name and filters of an existing one. */
	let form = $state<{ entry: CredentialEntry | null; type: CredentialTypeId; name: string; roles: string[]; profiles: ProfileFilter[] }>({ entry: null, type: 'anthropic_api', name: '', roles: [], profiles: [] });
	let formOpen = $state(false);
	let replacing = $state<CredentialEntry | null>(null);
	let replaceOpen = $state(false);
	let removing = $state<CredentialEntry | null>(null);
	let removeOpen = $state(false);
	let secret = $state('');
	let accountId = $state('');
	$effect(() => { if (!formOpen && !replaceOpen) { secret = ''; accountId = ''; } });

	function openForm(entry: CredentialEntry | null) {
		form = { entry, type: entry?.type ?? listing!.types[0].id, name: entry?.name ?? '', roles: [...(entry?.roles ?? [])], profiles: [...(entry?.profiles ?? [])] };
		formOpen = true;
	}
	const formType = $derived(listing?.types.find((type) => type.id === form.type));
	const token = (type: CredentialType) => ({ secret, ...(type.accountId ? { account_id: accountId } : {}) });
	const tokenReady = (type?: CredentialType) => !!type && !!secret && (!type.accountId || !!accountId);

	async function save() {
		const type = formType;
		if (!type) return;
		const policy = { name: form.name.trim(), roles: form.roles, profiles: form.profiles };
		const entry = form.entry;
		const saved = await write(() => (entry ? actions.editCredential(entry, policy) : actions.addCredential(type.id, policy, token(type))), `${policy.name} ${entry ? 'updated' : 'added'}`);
		if (saved) formOpen = false;
		secret = ''; accountId = '';
	}
	async function replace() {
		const entry = replacing;
		if (!entry) return;
		if (await write(() => actions.replaceCredential(entry, token(typeOf(entry.type))), `${entry.name} token replaced`)) replaceOpen = false;
		secret = ''; accountId = '';
	}
	async function remove() {
		const entry = removing;
		if (!entry) return;
		await write(() => actions.removeCredential(entry), `${entry.name} removed`);
		removeOpen = false;
	}
</script>

<svelte:head><title>My credentials · Concurro</title></svelte:head>
<svelte:window onpointermove={dragMove} onpointerup={() => dragEnd(true)} onpointercancel={() => dragEnd(false)} />
<PageHeader title="My credentials" subtitle="Your provider credentials, in the order Concurro tries them. A task you fund uses the first enabled one that matches the work.">
	{#snippet actions()}{#if listing}<Button variant="primary" icon={Plus} disabled={busy} onclick={() => openForm(null)}>Add credential</Button>{/if}{/snippet}
</PageHeader>

{#if failure && !listing}<ErrorState error={failure} />
{:else if !listing}<Skeleton rows={6} />
{:else}
	{#if paused.length}
		<div class="paused">
			<Alert tone="warning" title="{paused.length === 1 ? 'A task is' : `${paused.length} tasks are`} paused for credentials">
				{#each paused as item, index (item.task.issue + item.task.repo)}{index ? ', ' : ''}<a href={taskHref(item.task)}>{item.task.repo}#{item.task.issue}</a>{/each}
			</Alert>
		</div>
	{/if}
	<p class="sr-only" role="status" aria-live="polite">{announcement}</p>
	{#each listing.providers.filter((list) => list.entries.length) as list (list.provider)}
		{@const entries = ordered(list)}
		<section aria-labelledby="list-{list.provider}">
			<h2 id="list-{list.provider}">{list.label}</h2>
			<ol class="entries">
				{#each entries as entry, index (entry.id)}
					{@const type = typeOf(entry.type)}
					<li class="entry" data-entry={entry.id} class:off={!entry.enabled} class:dragging={dragging?.entry.id === entry.id}>
						<div class="row">
							{#if entries.length > 1}
								<button type="button" class="grip" aria-label="Reorder {entry.name}: position {index + 1} of {entries.length}" title="Drag to reorder, or press ↑ or ↓" {...handle(list, entry)}><GripVertical size={14} aria-hidden="true" /></button>
							{/if}
							<button type="button" class="summary" aria-expanded={!!expanded[entry.id]} aria-controls="details-{entry.id}" onclick={() => (expanded[entry.id] = !expanded[entry.id])}>
								<span class="chevron"><ChevronRight size={14} aria-hidden="true" /></span>
								<span class="text">
									<span class="name">{entry.name}</span>
									<span class="sub">{type.label} · {filterSummary(entry, listing.roles)}</span>
								</span>
							</button>
							{#if entry.status !== 'valid'}<Badge meta={credentialMeta[entry.status]} />{/if}
							<button type="button" class="switch" role="switch" aria-checked={entry.enabled} aria-label="Use {entry.name}" title={entry.enabled ? 'Enabled' : 'Disabled'} disabled={busy} onclick={() => toggle(entry)}><span></span></button>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger class="entry-menu" aria-label="Actions for {entry.name}"><Ellipsis size={16} aria-hidden="true" /></DropdownMenu.Trigger>
								<DropdownMenu.Portal>
									<DropdownMenu.Content class="user-menu" align="end" sideOffset={4}>
										<DropdownMenu.Item class="menu-item" onSelect={() => openForm(entry)}><Pencil size={14} aria-hidden="true" /><span>Edit</span></DropdownMenu.Item>
										<DropdownMenu.Item class="menu-item" onSelect={() => { replacing = entry; replaceOpen = true; }}><KeyRound size={14} aria-hidden="true" /><span>Replace token</span></DropdownMenu.Item>
										<DropdownMenu.Separator class="menu-sep" />
										<DropdownMenu.Item class="menu-item" onSelect={() => { removing = entry; removeOpen = true; }}><Trash2 size={14} aria-hidden="true" /><span>Remove</span></DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Portal>
							</DropdownMenu.Root>
						</div>
						{#if expanded[entry.id]}
							<dl id="details-{entry.id}">
								<div><dt>Token saved</dt><dd>{entry.lastUpdated ? relTime(entry.lastUpdated) : 'Unknown'}</dd></div>
								<div><dt>Last used</dt><dd>{entry.lastUsed ? relTime(entry.lastUsed) : 'Never'}</dd></div>
								<div><dt>Expires</dt><dd>{entry.expiryKnown && entry.expiresAt ? entry.expiresAt : 'Unknown'}</dd></div>
								<div><dt>Fingerprint</dt><dd class="mono">{entry.fingerprint ?? '—'}</dd></div>
								{#if entry.accountLabel}<div><dt>Account</dt><dd>{entry.accountLabel}{entry.accountVerified ? '' : ' (not verified)'}</dd></div>{/if}
								{#if entry.roles.length || entry.profiles.length}
									<div class="wide"><dt>Used for</dt><dd>
										{#if entry.roles.length}{entry.roles.map((key) => listing?.roles.find((role) => role.key === key)?.label ?? key).join(', ')}{:else}All roles{/if}
										·
										{#if entry.profiles.length}{entry.profiles.map((filter) => `${filter.profile} in ${filter.target}`).join(', ')}{:else}all profiles{/if}
									</dd></div>
								{/if}
							</dl>
						{/if}
					</li>
				{/each}
			</ol>
		</section>
	{:else}
		<EmptyState icon={KeyRound} title="No credentials yet" text="Add an API key or a subscription token to fund tasks with your own account.">
			<Button variant="primary" icon={Plus} onclick={() => openForm(null)}>Add credential</Button>
		</EmptyState>
	{/each}
{/if}

<Modal bind:open={formOpen} title={form.entry ? `Edit ${form.entry.name}` : 'Add credential'}>
	{#if listing && formType}
		<form id="credential" onsubmit={(event) => { event.preventDefault(); save(); }}>
			{#if form.entry}
				<p class="fixed"><span>Type</span>{formType.label}</p>
			{:else}
				<label>Type
					<select bind:value={form.type} onchange={() => { form.profiles = []; }}>
						{#each listing.providers as list (list.provider)}
							<optgroup label={list.label}>{#each listing.types.filter((type) => type.provider === list.provider) as type (type.id)}<option value={type.id}>{type.label}</option>{/each}</optgroup>
						{/each}
					</select>
				</label>
			{/if}
			<label>Name<input required maxlength="80" autocomplete="off" placeholder={formType.label} bind:value={form.name} /></label>
			{#if !form.entry}<TokenFields type={formType} bind:secret bind:accountId />{/if}
			<UseFor bind:roles={form.roles} bind:profiles={form.profiles} roleOptions={listing.roles} profileOptions={profileOptions(listing.targets, formType.provider, form.profiles)} />
		</form>
		{#if MOCK}<Alert tone="note" title="Mock mode">Synthetic storage only. Nothing leaves this browser tab.</Alert>{/if}
	{/if}
	{#snippet footer()}<Button onclick={() => (formOpen = false)}>Cancel</Button><Button type="submit" form="credential" variant="primary" disabled={busy || !form.name.trim() || (!form.entry && !tokenReady(formType))} icon={busy ? LoaderCircle : undefined}>{busy ? 'Saving…' : form.entry ? 'Save' : 'Add'}</Button>{/snippet}
</Modal>

<Modal bind:open={replaceOpen} title="Replace token for {replacing?.name ?? ''}" description="The name, filters and position stay as they are. Tasks already running keep the token they started with.">
	{#if replacing && listing}
		<form id="replacement" onsubmit={(event) => { event.preventDefault(); replace(); }}><TokenFields type={typeOf(replacing.type)} bind:secret bind:accountId /></form>
	{/if}
	{#snippet footer()}<Button onclick={() => (replaceOpen = false)}>Cancel</Button><Button type="submit" form="replacement" variant="primary" disabled={busy || !replacing || !listing || !tokenReady(typeOf(replacing.type))} icon={busy ? LoaderCircle : undefined}>{busy ? 'Saving…' : 'Replace token'}</Button>{/snippet}
</Modal>

<Modal bind:open={removeOpen} title="Remove {removing?.name ?? ''}?" description="Takes this credential off your list and deletes its stored token from Concurro. Work running on it is stopped; the record of what it paid for is kept. This does not revoke the key or sign the account out at the provider. To keep the token but stop using it, disable the credential instead.">
	{#snippet footer()}<Button onclick={() => (removeOpen = false)}>Cancel</Button><Button variant="danger-solid" disabled={busy} onclick={remove}>Remove credential</Button>{/snippet}
</Modal>

<style>
	.paused { margin-bottom: var(--s-4); }
	section { margin-bottom: var(--s-5); }
	h2 { margin: 0 0 var(--s-2); font-size: var(--fs-md); font-weight: var(--fw-semibold); }
	.entries { margin: 0; padding: 0; list-style: none; border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); }
	.entry + .entry { border-top: 1px solid var(--border); }
	.entry.dragging { opacity: 0.5; }
	.row { display: flex; align-items: center; gap: var(--s-2); padding: var(--s-2) var(--s-3); }
	.grip, :global(.entry-menu) { display: flex; padding: var(--s-1); border: 0; border-radius: var(--r-sm); background: none; color: var(--text-2); cursor: pointer; }
	.grip { color: var(--text-3); cursor: grab; touch-action: none; }
	.grip:hover, :global(.entry-menu:hover) { background: var(--surface-3); color: var(--text); }
	.entry.dragging .grip { cursor: grabbing; }
	.summary { display: flex; flex: 1; align-items: center; gap: var(--s-2); min-width: 0; padding: var(--s-1); border: 0; background: none; text-align: left; cursor: pointer; }
	.chevron { display: flex; color: var(--text-3); transition: transform var(--dur) var(--ease); }
	.summary[aria-expanded='true'] .chevron { transform: rotate(90deg); }
	.text { display: grid; min-width: 0; }
	.name { font-size: var(--fs-md); font-weight: var(--fw-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.sub { font-size: var(--fs-xs); color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.off .name, .off .sub { color: var(--text-3); }
	.switch { flex: none; width: 32px; height: 18px; padding: 2px; border: 1px solid var(--border-strong); border-radius: var(--r-full); background: var(--surface-3); cursor: pointer; transition: background var(--dur) var(--ease); }
	.switch span { display: block; width: 12px; height: 12px; border-radius: 50%; background: var(--neutral-solid); transition: transform var(--dur) var(--ease); }
	.switch[aria-checked='true'] { border-color: var(--accent); background: var(--accent); }
	.switch[aria-checked='true'] span { background: var(--on-accent); transform: translateX(14px); }
	.switch:disabled { cursor: default; opacity: 0.6; }
	dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--s-3); margin: 0; padding: var(--s-2) var(--s-4) var(--s-3) var(--s-7); font-size: var(--fs-sm); }
	dl .wide { grid-column: 1 / -1; }
	dt { font-size: var(--fs-xs); color: var(--text-2); }
	dd { margin: 0; overflow-wrap: anywhere; }
	form { display: grid; gap: var(--s-3); margin-bottom: var(--s-3); }
	form > label, .fixed { display: grid; gap: var(--s-2); margin: 0; font-size: var(--fs-sm); }
	.fixed span { font-size: var(--fs-xs); color: var(--text-2); }
	input, select { padding: var(--s-2); border: 1px solid var(--border-strong); border-radius: var(--r-md); background: var(--surface); color: var(--text); }
	@media (max-width: 560px) {
		.row { gap: var(--s-1); padding-inline: var(--s-2); }
		dl { padding-left: var(--s-4); }
	}
</style>
