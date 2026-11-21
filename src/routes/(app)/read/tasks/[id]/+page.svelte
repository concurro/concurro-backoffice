<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { withBase } from '#lib/paths.ts';
	import { followReadModel, readModel, type ReadTaskDetail } from '#lib/api/read-model.ts';

	let detail = $state<ReadTaskDetail | null>(null);
	let transcripts = $state<Record<string, unknown[]>>({});
	let error = $state('');
	const id = $derived(page.params.id ?? '');

	/** Refresh the viewer tier and task records after every model revision. */
	async function refresh() {
		try {
			detail = await readModel<ReadTaskDetail>(`/tasks/${encodeURIComponent(id)}`);
			error = '';
		} catch (cause) {
			detail = null;
			error = cause instanceof Error ? cause.message : 'The task is unavailable.';
		}
	}

	/** Load the original ordered lines through the writer-checked proxy. */
	async function transcript(record: { entity: string; body: Record<string, unknown> }) {
		try {
			const key = record.entity === 'imported_turn'
				? `${String(record.body.deployment)}:${String(record.body.source_id)}`
				: String(record.body.turn_id);
			const source = record.entity === 'imported_turn'
				? `/imports/${encodeURIComponent(String(record.body.deployment))}/turns/${encodeURIComponent(String(record.body.source_id))}`
				: `/tasks/${encodeURIComponent(id)}/turns/${encodeURIComponent(key)}`;
			const lines: unknown[] = [];
			let cursor: number | null = null;
			do {
				const query: string = cursor === null ? '' : `?cursor=${cursor}`;
				const page = await readModel<{ lines: unknown[]; next_cursor: number | null }>(
					`${source}/transcript${query}`
				);
				lines.push(...page.lines);
				cursor = page.next_cursor;
			} while (cursor !== null);
			transcripts[key] = lines;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'The transcript is unavailable.';
		}
	}

	onMount(() => {
		void refresh();
		return followReadModel(() => void refresh());
	});
</script>

<svelte:head><title>Task · Concurro</title></svelte:head>
<PageHeader title="Task history" subtitle="Current access is checked on every read." />
<p><a href={withBase('/read')}>← All tasks</a></p>
{#if error}<p class="notice" role="alert">{error}</p>{/if}
{#if detail}
	<section class="card">
		<h2>{detail.task.repository}#{detail.task.issue_number}</h2>
		<p>{detail.task.kind === 'standalone_pr_review' ? 'PR review' : 'Contribution'} · {detail.task.stage}</p>
		{#if detail.task.reason}<p>{detail.task.reason}</p>{/if}
		{#if detail.task.pull_request}<p><a href={detail.task.pull_request}>Pull request</a></p>{/if}
		<p class="muted">Viewing as {detail.viewer.login} · {detail.viewer.tier}</p>
	</section>
	{#if detail.own_consent?.length}
		<section class="card"><h2>Your consent history</h2><pre>{JSON.stringify(detail.own_consent, null, 2)}</pre></section>
	{/if}
	{#if detail.records?.length}
		<section class="records">
			<h2>Recorded work</h2>
			{#each detail.records as record, index (`${record.entity}-${index}`)}
				<details class="card">
					<summary>{record.entity} · {String(record.body.status ?? record.body.name ?? record.body.turn_id ?? record.body.request_id ?? '')}</summary>
					{#if (record.entity === 'turn' && record.body.turn_id) || record.entity === 'imported_turn'}
						<button onclick={() => void transcript(record)}>Read transcript</button>
						{@const key = record.entity === 'imported_turn' ? `${String(record.body.deployment)}:${String(record.body.source_id)}` : String(record.body.turn_id)}
						{#if transcripts[key]}<pre>{JSON.stringify(transcripts[key], null, 2)}</pre>{/if}
					{/if}
					<pre>{JSON.stringify(record.body, null, 2)}</pre>
				</details>
			{/each}
		</section>
	{/if}
{:else if !error}<p class="muted">Loading task…</p>{/if}

<style>
	.card { padding: var(--s-4); border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); }
	.records { display: grid; gap: var(--s-2); }
	.records h2 { margin: 0; }
	summary { cursor: pointer; font-weight: var(--fw-semibold); }
	pre { max-height: 28rem; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
	.muted { color: var(--text-3); }
	.notice { padding: var(--s-3); border: 1px solid var(--border); border-radius: var(--r-md); }
</style>
