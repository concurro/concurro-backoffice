<script lang="ts">
	import { ExternalLink, GitPullRequest, SquareTerminal } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import StageStepper from '#lib/components/StageStepper.svelte';
	import Timeline from '#lib/components/Timeline.svelte';
	import CommandBar from '#lib/components/task/CommandBar.svelte';
	import CompletionPanel from '#lib/components/task/CompletionPanel.svelte';
	import DesignReviewPanel from '#lib/components/task/DesignReviewPanel.svelte';
	import PlanPanel from '#lib/components/task/PlanPanel.svelte';
	import PrReviewPanel from '#lib/components/task/PrReviewPanel.svelte';
	import ReadinessPanel from '#lib/components/task/ReadinessPanel.svelte';
	import { relTime, targetHref, taskHref } from '#lib/format.ts';
	import { ciMeta, taskStageMeta } from '#lib/meta.ts';
	import { ME, users } from '#lib/mock/reference.ts';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();
	const name = (login: string) => users.find((u) => u.login === login)?.name ?? login;
</script>

<svelte:head><title>{params.repo}#{params.issue} · Concurro</title></svelte:head>

{#await data.result}
	<Skeleton rows={2} />
	<Skeleton height={62} />
	<Skeleton height={64} />
	<div class="grid">
		<div class="col"><Panel title="Plan"><Skeleton rows={8} /></Panel><Panel title="Design review"><Skeleton rows={4} /></Panel></div>
		<div class="col"><Panel title="Readiness"><Skeleton rows={4} /></Panel><Panel title="Budgets"><Skeleton rows={3} /></Panel></div>
	</div>
{:then { task }}
	{@const turns = `${taskHref(task)}/turns`}
	<PageHeader title={task.title}>
		{#snippet eyebrow()}
			<a class="mono" href={targetHref(task)}>{task.owner}/{task.repo}</a>
			<span class="mono">#{task.issue}</span>
			<span>opened by</span><Avatar login={task.author} size={18} label />
		{/snippet}
		{#snippet actions()}
			<Button icon={SquareTerminal} href={turns}>Run diagnostics</Button>
			<Button variant="ghost" icon={ExternalLink} href="#main">GitHub</Button>
		{/snippet}
		<Badge meta={taskStageMeta(task)} />
		{#if task.paused}<Badge tone="danger">awaiting_credentials</Badge>{/if}
		<Badge tone={task.mode === 'autonomous' ? 'accent' : 'neutral'}>{task.mode}</Badge>
		{#if task.pr}
			<span class="pr">
				<GitPullRequest size={14} aria-hidden="true" />
				<a href="#pr-review">#{task.pr.number}</a>
				<span class="mono muted">{task.pr.headSha}</span>
				<span class="num diffstat"><span class="add">+{task.pr.additions}</span> <span class="del">−{task.pr.deletions}</span></span>
			</span>
			<Badge plain meta={ciMeta[task.pr.ci]} />
		{/if}
		{#each task.labels as label}<span class="label">{label}</span>{/each}
		<span class="muted updated">Updated {relTime(task.updatedAt)}</span>
	</PageHeader>

	<StageStepper {task} />

	<Alert tone={task.alert.tone} title={task.alert.title}>
		<Inline text={task.alert.body} />
		{#if task.question}<blockquote>{task.question}</blockquote>{/if}
		{#snippet actions()}
			{#if task.paused}<Button size="sm" href="/me/credentials">Fix credentials</Button>{/if}
		{/snippet}
	</Alert>

	<div class="grid">
		<div class="col">
			<PlanPanel {task} />
			<DesignReviewPanel {task} />
			<PrReviewPanel {task} />
		</div>
		<div class="col">
			{#if task.completion}<CompletionPanel completion={task.completion} />{/if}
			<ReadinessPanel {task} />
			<Panel title="Budgets" id="budgets">
				<div class="meters">
					<Meter label="Model calls" {...task.budgets.modelCalls} />
					<Meter label="Fix rounds" {...task.budgets.fixRounds} />
					<Meter label="Plan revisions" {...task.budgets.planRevisions} />
				</div>
			</Panel>
			<Panel title="Sponsor" id="sponsor">
				{#if task.sponsor}
					<div class="sponsor">
						<Avatar login={task.sponsor} size={32} />
						<div>
							<p class="sponsor-name">{name(task.sponsor)}{#if task.sponsor === ME}<span class="you">you</span>{/if}</p>
							<p class="muted">@{task.sponsor} pays for this task’s model calls</p>
						</div>
					</div>
					{#if task.paused}
						<p class="paused tone-danger"><strong>awaiting_credentials</strong> {task.pauseReason}</p>
					{/if}
				{:else}
					<p class="muted">No sponsor. Model calls use the target’s shared credentials. A writer can run <code>/concurro sponsor</code> to pay with their own.</p>
				{/if}
			</Panel>
			<Panel title="Timeline" meta={String(task.timeline.length)} id="timeline">
				<Timeline events={task.timeline} turnHref={(n) => `${turns}/${n}`} />
			</Panel>
		</div>
	</div>

	<CommandBar {task} />
{:catch error}
	<ErrorState {error} />
{/await}

<style>
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: var(--s-4);
		align-items: start;
	}
	.col {
		display: grid;
		gap: var(--s-4);
		min-width: 0;
	}
	.pr {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--fs-sm);
		color: var(--text-2);
	}
	.diffstat {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
	}
	.add {
		color: var(--success-fg);
	}
	.del {
		color: var(--danger-fg);
	}
	.label {
		padding: 0 7px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		color: var(--text-2);
		font-size: var(--fs-xs);
		line-height: 18px;
	}
	.updated {
		font-size: var(--fs-xs);
	}
	blockquote {
		margin: var(--s-2) 0 0;
		padding-left: var(--s-3);
		border-left: 2px solid var(--warning-solid);
		color: var(--text);
	}
	.meters {
		display: grid;
		gap: var(--s-4);
	}
	.sponsor {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		font-size: var(--fs-sm);
	}
	.sponsor-name {
		font-weight: var(--fw-medium);
	}
	.you {
		margin-left: var(--s-2);
		padding: 0 6px;
		border-radius: var(--r-full);
		background: var(--accent-soft);
		color: var(--accent-text);
		font-size: var(--fs-2xs);
	}
	.paused {
		margin-top: var(--s-3);
		padding: var(--s-2) var(--s-3);
		border: 1px solid var(--tone-border);
		border-radius: var(--r-md);
		background: var(--tone-bg);
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.paused strong {
		display: block;
		color: var(--tone-fg);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
	}
	code {
		padding: 1px 4px;
		border-radius: var(--r-sm);
		background: var(--surface-3);
	}
	@media (max-width: 1100px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
