<script lang="ts">
	import { ArrowLeftRight, GitBranch, GitPullRequest, Lock, PlayCircle } from 'lucide-svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import Tabs from '#lib/components/Tabs.svelte';
	import TaskSignals from '#lib/components/TaskSignals.svelte';
	import { duration, relTime, taskHref } from '#lib/format.ts';
	import { withBase } from '#lib/paths.ts';
	import { roleLabel, taskStageMeta } from '#lib/meta.ts';
	import { profile } from '#lib/api/index.ts';
	import type { ActionsRun, Stage, Task, Tone } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();
	let tab = $state('issues');
	let group = $state('all');

	const groups: Record<string, { label: string; stages?: Stage[] }> = {
		all: { label: 'All stages' },
		active: { label: 'Active', stages: ['intake', 'plan', 'plan_qc', 'implement', 'publish', 'review'] },
		human: { label: 'Awaiting human', stages: ['clarify', 'planned', 'gates'] },
		parked: { label: 'Blocked or stopped', stages: ['blocked', 'escalated', 'stopped'] },
		done: { label: 'Finished', stages: ['merged', 'closed', 'rejected'] }
	};
	const inGroup = (tasks: Task[]) => tasks.filter((t) => groups[group].stages?.includes(t.stage) ?? true).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

	const runTone: Record<ActionsRun['status'], Tone> = { success: 'success', failure: 'danger', in_progress: 'info', queued: 'neutral', cancelled: 'warning' };
</script>

<svelte:head><title>{params.owner}/{params.repo} · Concurro</title></svelte:head>

{#await data.result}
	<Skeleton rows={3} />
	<Panel title="Issues"><Skeleton rows={8} /></Panel>
{:then { target, tasks, runs, runsMessage }}
	{@const prs = tasks.filter((t) => t.pr)}
	<PageHeader title="{target.owner}/{target.repo}" subtitle={target.description}>
		<span class="pair">
			<span class="mono">{target.owner}/{target.repo}</span>
			<ArrowLeftRight size={14} aria-label="forked to" />
			<span class="mono">{target.fork}</span>
		</span>
		<Badge tone={target.mode === 'autonomous' ? 'accent' : 'neutral'}>{target.mode}</Badge>
		<span class="branch"><GitBranch size={13} aria-hidden="true" /><span class="mono">{target.defaultBranch}</span></span>
	</PageHeader>

	<ul class="roster" aria-label="Model roster">
		{#each target.roster as r}
			<li><span class="role">{r.agent}</span><span class="mono">{r.profile}</span></li>
		{/each}
	</ul>

	<Tabs
		bind:value={tab}
		tabs={[
			{ value: 'issues', label: 'Issues', count: tasks.length },
			{ value: 'pulls', label: 'Pull requests', count: prs.length },
			{ value: 'runs', label: 'Actions runs', count: runs.length },
			{ value: 'config', label: 'Configuration' }
		]}
	>
		{#if tab === 'issues'}
			{@const rows = inGroup(tasks)}
			<Panel flush title="Enrolled issues" meta={String(rows.length)}>
				{#snippet actions()}
					<select aria-label="Filter by stage" bind:value={group}>
						{#each Object.entries(groups) as [value, g]}<option {value}>{g.label}</option>{/each}
					</select>
				{/snippet}
				{#if rows.length}
					<DataTable label="Issues">
						<thead><tr><th class="r">#</th><th>Issue</th><th>Stage</th><th>Sponsor</th><th>Review</th><th class="r">Updated</th></tr></thead>
						<tbody>
							{#each rows as t (t.issue)}
								<tr>
									<td class="r mono muted">{t.issue}</td>
									<td class="title">
										<a href={taskHref(t)}><Inline text={t.title} /></a>
										<p class="sub">opened by {t.author} · {t.labels.join(' · ')}</p>
									</td>
									<td class="nowrap"><Badge meta={taskStageMeta(t)} />{#if t.paused}<p class="sub mono">awaiting_credentials</p>{/if}</td>
									<td>{#if t.sponsor}<Avatar login={t.sponsor} />{:else}<span class="muted">—</span>{/if}</td>
									<td><TaskSignals task={t} /></td>
									<td class="r nowrap muted">{relTime(t.updatedAt)}</td>
								</tr>
							{/each}
						</tbody>
					</DataTable>
				{:else}
					<EmptyState title="No issues in this group" text="Label an issue with `concurro` on GitHub and run /concurro start to enroll it." />
				{/if}
			</Panel>
		{:else if tab === 'pulls'}
			<Panel flush title="Pull requests from Concurro" meta={String(prs.length)}>
				{#if prs.length}
					<DataTable label="Pull requests">
						<thead><tr><th class="r">#</th><th>Pull request</th><th>Head</th><th>Stage</th><th>Review</th><th class="r">Changes</th><th>State</th></tr></thead>
						<tbody>
							{#each prs as t (t.issue)}
								{@const pr = t.pr!}
								<tr>
									<td class="r mono muted">{pr.number}</td>
									<td class="title">
										<a href={taskHref(t)}>{pr.title}</a>
										<p class="sub"><span class="mono">{pr.branch}</span> · closes #{t.issue}</p>
									</td>
									<td class="mono nowrap">{pr.headSha}</td>
									<td><Badge meta={taskStageMeta(t)} /></td>
									<td><TaskSignals task={t} /></td>
									<td class="r nowrap mono">{#if pr.additions !== null && pr.deletions !== null}<span class="add">+{pr.additions}</span> <span class="del">−{pr.deletions}</span>{:else}<span class="muted" title="Line counts are unavailable">—</span>{/if}</td>
									<td class="nowrap"><Badge plain tone={t.stage === 'merged' ? 'accent' : pr.ready ? 'success' : 'neutral'}>{t.stage === 'merged' ? 'Merged' : pr.ready ? 'Ready for review' : 'Draft'}</Badge></td>
								</tr>
							{/each}
						</tbody>
					</DataTable>
				{:else}
					<EmptyState icon={GitPullRequest} title="No pull requests yet" text="Concurro opens a draft pull request from the fork when an implementation is published." />
				{/if}
			</Panel>
		{:else if tab === 'runs'}
			<Panel flush title="Actions runs on the fork" meta={String(runs.length)}>
				{#if runs.length}
					<DataTable label="Actions runs">
						<thead><tr><th>Run</th><th>Agent turn</th><th>Status</th><th>Task</th><th class="r">Started</th><th class="r">Duration</th></tr></thead>
						<tbody>
							{#each runs as run (run.id)}
								{@const task = run.task ?? { owner: target.owner, repo: target.repo, issue: run.issue }}
								<tr>
									<td class="mono nowrap">{run.id}</td>
									<td class="title"><a href={`${taskHref(task)}/turns/${run.turn}`}>{run.title}</a></td>
									<td><Badge tone={runTone[run.status]}>{run.status}</Badge></td>
									<td class="mono nowrap"><a href={taskHref(task)}>{task.repo}#{task.issue}</a></td>
									<td class="r nowrap muted">{relTime(run.startedAt)}</td>
									<td class="r nowrap">{duration(run.durationS * 1000)}</td>
								</tr>
							{/each}
						</tbody>
					</DataTable>
				{:else if runsMessage}
					<EmptyState icon={PlayCircle} title="Runs unavailable" text={runsMessage} />
				{:else}
					<EmptyState icon={PlayCircle} title="No runs yet" text="Each agent turn executes as a GitHub Actions run on the fork." />
				{/if}
			</Panel>
		{:else}
			<div class="config">
				<Panel flush title="Model roster">
					<DataTable label="Model roster">
						<thead><tr><th>Role</th><th>Agent</th><th>Profile</th><th>Provider</th><th>Model</th><th>Effort</th></tr></thead>
						<tbody>
							{#each target.roster as r}
								{@const p = profile(r.profile)}
								<tr><td>{roleLabel[r.role]}</td><td class="mono">{r.agent}</td><td class="mono">{p.name}</td><td>{p.provider}</td><td class="mono">{p.model}</td><td>{p.effort}</td></tr>
							{/each}
						</tbody>
					</DataTable>
				</Panel>
				<Panel title="Target configuration">
					{#snippet actions()}<span class="ro"><Lock size={12} aria-hidden="true" /> Read-only · managed in the service repository</span>{/snippet}
					<CodeBlock text={target.config} />
				</Panel>
			</div>
		{/if}
	</Tabs>
{:catch error}
	<ErrorState {error} />
{/await}

<style>
	.pair,
	.branch {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.roster {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.roster li {
		display: inline-flex;
		gap: var(--s-2);
		padding: 2px var(--s-2);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
		font-size: var(--fs-xs);
	}
	.role {
		color: var(--text-3);
	}
	select {
		height: 26px;
		padding: 0 var(--s-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		background: var(--surface);
		font-size: var(--fs-xs);
	}
	.add {
		color: var(--success-fg);
	}
	.del {
		color: var(--danger-fg);
	}
	.config {
		display: grid;
		gap: var(--s-4);
	}
	.ro {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
</style>
