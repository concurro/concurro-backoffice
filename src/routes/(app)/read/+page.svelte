<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { withBase } from '#lib/paths.ts';
	import { followReadModel, readModel, type ReadIndexPage, type ReadIndexRow, type ReadTarget, type ReadTask, type ReadTaskPage } from '#lib/api/read-model.ts';

	let tasks = $state<ReadTask[]>([]);
	let revision = $state(0);
	let consent = $state<{ repository: string; number: number; entity: string; body: Record<string, unknown> }[]>([]);
	let loading = $state(true);
	let error = $state('');
	let targets = $state<ReadTarget[]>([]);
	let selected = $state('');
	let index = $state<Record<'issue' | 'pull' | 'run', ReadIndexRow[]>>({ issue: [], pull: [], run: [] });
	let indexError = $state('');
	let generation = 0;

	/** Read every page of the selected target's three durable lists. */
	async function loadIndex(target: string, current: number) {
		const path = target.split('/').map(encodeURIComponent).join('/');
		const next: typeof index = { issue: [], pull: [], run: [] };
		try {
			for (const kind of ['issue', 'pull', 'run'] as const) {
				let cursor: string | null = null;
				do {
					const query = new URLSearchParams({ kind });
					if (cursor) query.set('cursor', cursor);
					const page: ReadIndexPage = await readModel<ReadIndexPage>(`/targets/${path}/index?${query}`);
					next[kind].push(...page.rows);
					cursor = page.next_cursor;
					if (current !== generation || target !== selected) return;
				} while (cursor);
			}
			index = next;
			indexError = '';
		} catch (cause) {
			if (current === generation && target === selected) indexError = cause instanceof Error ? cause.message : 'The target index is unavailable.';
		}
	}

	/** Read all accessible pages at one display refresh. */
	async function refresh() {
		const current = ++generation;
		let cursor: string | null = null;
		const found: ReadTask[] = [];
		try {
			do {
				const page: ReadTaskPage = await readModel<ReadTaskPage>(`/tasks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);
				found.push(...page.tasks);
				cursor = page.next_cursor;
				if (current !== generation) return;
				revision = page.revision;
			} while (cursor);
			tasks = found;
			const history = await readModel<{ facts: typeof consent }>(`/me/sponsorships`);
			if (current !== generation) return;
			consent = history.facts;
			const listing = await readModel<{ targets: ReadTarget[] }>('/targets');
			if (current !== generation) return;
			targets = listing.targets;
			if (!selected || !targets.some((target) => target.upstream === selected)) selected = targets[0]?.upstream ?? '';
			if (selected) await loadIndex(selected, current);
			error = '';
		} catch (cause) {
			if (current === generation) error = cause instanceof Error ? cause.message : 'The read model is unavailable.';
		} finally {
			if (current === generation) loading = false;
		}
	}

	onMount(() => {
		void refresh();
		const stop = followReadModel(() => void refresh());
		const poll = window.setInterval(() => void refresh(), 60_000);
		return () => { stop(); window.clearInterval(poll); };
	});
</script>

<svelte:head><title>Task history · Concurro</title></svelte:head>
<PageHeader title="Task history" subtitle="Tasks visible through your current GitHub access." />

{#if error}<p class="notice" role="alert">{error}</p>{/if}
{#if loading}<p class="muted">Loading task history…</p>{:else if !tasks.length}<p class="muted">No accessible tasks were found.</p>{:else}
	<p class="muted">Read model revision {revision}</p>
	<ul class="task-list">
		{#each tasks as task (task.id)}
			<li>
				<a href={withBase(`/read/tasks/${encodeURIComponent(task.id)}`)}>
					<strong>{task.repository}#{task.issue_number}</strong>
					<span>{task.kind === 'standalone_pr_review' ? 'PR review' : 'Contribution'} · {task.stage}</span>
				</a>
				{#if task.reason}<p>{task.reason}</p>{/if}
			</li>
		{/each}
	</ul>
{/if}

<section class="history">
	<h2>Your consent history</h2>
	{#if consent.length}
		<ul>
			{#each consent as fact, index (`${fact.repository}-${fact.number}-${fact.entity}-${index}`)}
				<li><a href={`https://github.com/${fact.repository}/issues/${fact.number}`}>{fact.repository}#{fact.number}</a> · {fact.entity} · {String(fact.body.provider ?? '')}</li>
			{/each}
		</ul>
	{:else if !loading}<p class="muted">No consent history was found on accessible issues.</p>{/if}
</section>

{#if targets.length}
	<section class="history">
		<h2>Target index</h2>
		<label for="read-target">Target</label>
		<select id="read-target" bind:value={selected} onchange={() => void loadIndex(selected, generation)}>
			{#each targets as target}<option value={target.upstream}>{target.upstream}</option>{/each}
		</select>
		{#if indexError}<p class="notice" role="alert">{indexError}</p>{/if}
		<div class="index-grid">
			{#each ['issue', 'pull', 'run'] as kind}
				<div>
					<h3>{kind === 'issue' ? 'Issues' : kind === 'pull' ? 'Pull requests' : 'Executor runs'}</h3>
					<ul>
						{#each index[kind as 'issue' | 'pull' | 'run'] as row (row.item_id)}
							<li><strong>#{row.item_id}</strong> {String(row.document.title ?? row.document.status ?? '')}</li>
						{:else}
							<li class="muted">No entries.</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.task-list { display: grid; gap: var(--s-2); margin: 0; padding: 0; list-style: none; }
	.task-list li { padding: var(--s-3); border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); }
	.task-list a { display: flex; justify-content: space-between; gap: var(--s-3); flex-wrap: wrap; }
	.task-list p { margin: var(--s-2) 0 0; color: var(--text-2); }
	.muted { color: var(--text-3); }
	.notice { padding: var(--s-3); border: 1px solid var(--border); border-radius: var(--r-md); }
	.history { padding: var(--s-4); border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); }
	.history ul { padding-left: var(--s-4); }
	.index-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s-4); }
	.index-grid ul { margin: 0; }
	.index-grid li { margin-bottom: var(--s-2); overflow-wrap: anywhere; }
	@media (max-width: 760px) { .index-grid { grid-template-columns: 1fr; } }
</style>
