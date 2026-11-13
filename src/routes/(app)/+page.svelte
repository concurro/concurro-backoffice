<script lang="ts">
	import { Activity, CircleCheck, FileCheck, GitPullRequestArrow, KeyRound, MessageCircleQuestionMark, OctagonAlert, PartyPopper, UserRoundCheck, CircleX } from 'lucide-svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { relTime, targetHref, taskHref } from '#lib/format.ts';
	import { MERGED_STAGES, stageMeta, stepIndex, steps, type IconType } from '#lib/meta.ts';
	import { session } from '#lib/api/index.ts';
	import { needsYou } from '#lib/needs-you.ts';
	import { withBase } from '#lib/paths.ts';
	import type { PageProps } from './$types';
	import type { NeedsYouItem, Stage, Target, Task, Tone } from '#lib/types.ts';

	let { data }: PageProps = $props();

	const ACTIVE: Stage[] = ['intake', 'plan', 'plan_qc', 'implement', 'publish', 'review'];
	const PARKED: Stage[] = ['blocked', 'escalated', 'stopped'];
	const DONE: Stage[] = [...MERGED_STAGES, 'closed', 'rejected'];

	function tiles(tasks: Task[]) {
		const count = (f: (t: Task) => boolean) => tasks.filter(f).length;
		return [
			{ label: 'Active', value: count((t) => ACTIVE.includes(t.stage)), hint: 'Agents are working', icon: Activity, tone: 'info' },
			{ label: 'Awaiting human', value: count((t) => t.stage === 'clarify' || t.stage === 'planned'), hint: 'Approval or input needed', icon: UserRoundCheck, tone: 'warning' },
			{ label: 'Blocked', value: count((t) => t.stage === 'blocked' || t.stage === 'escalated'), hint: 'Paused or escalated', icon: OctagonAlert, tone: 'danger' },
			{ label: 'Ready for merge', value: count((t) => t.stage === 'gates' && (t.pr?.ready ?? true)), hint: 'Handed off to maintainers', icon: GitPullRequestArrow, tone: 'success' }
		] satisfies { label: string; value: number; hint: string; icon: IconType; tone: Tone }[];
	}

	const needMeta: Record<NeedsYouItem['kind'], { label: string; icon: IconType; tone: Tone; action: string; href?: string }> = {
		plan_approval: { label: 'Plan approval', icon: FileCheck, tone: 'accent', action: 'Review plan' },
		input_needed: { label: 'Input needed', icon: MessageCircleQuestionMark, tone: 'warning', action: 'Answer' },
		credentials: { label: 'Credentials', icon: KeyRound, tone: 'danger', action: 'Fix credentials', href: withBase('/me/credentials') },
		ci_red: { label: 'CI failing', icon: CircleX, tone: 'danger', action: 'Open task' }
	};

	function stageCounts(target: Target, tasks: Task[]) {
		const mine = tasks.filter((t) => t.owner === target.owner && t.repo === target.repo);
		const live = mine.filter((t) => !PARKED.includes(t.stage) && !DONE.includes(t.stage));
		return {
			total: mine.length,
			perStep: steps.map((s, i) => ({ label: s.label, n: live.filter((t) => stepIndex(t.atStage) === i).length })),
			parked: mine.filter((t) => PARKED.includes(t.stage)).length,
			done: mine.filter((t) => DONE.includes(t.stage)).length
		};
	}
</script>

<svelte:head><title>Overview · Concurro</title></svelte:head>

<PageHeader title="Overview" subtitle="Everything Concurro is working on across your targets." />

{#await data.overview}
	<div class="tiles">{#each { length: 4 } as _}<div class="tile"><Skeleton rows={2} /></div>{/each}</div>
	<div class="split">
		<Panel title="Needs you"><Skeleton rows={6} /></Panel>
		<Panel title="Recent activity"><Skeleton rows={6} /></Panel>
	</div>
	<Panel title="Targets"><Skeleton height={120} /></Panel>
{:then { tasks, targets, activity }}
	{@const needs = needsYou(tasks)}
	<div class="tiles">
		{#each tiles(tasks) as tile}
			<div class="tile tone-{tile.tone}">
				<div class="tile-head"><span>{tile.label}</span><span class="tile-icon"><tile.icon size={15} aria-hidden="true" /></span></div>
				<p class="tile-value num">{tile.value}</p>
				<p class="tile-hint">{tile.hint}</p>
			</div>
		{/each}
	</div>

	<div class="split">
		<Panel title="Needs you" meta={String(needs.length)} flush>
			{#if needs.length}
				<ul class="needs">
					{#each needs as item}
						{@const meta = needMeta[item.kind]}
						<li class="tone-{meta.tone}">
							<span class="need-icon"><meta.icon size={15} aria-hidden="true" /></span>
							<div class="need-body">
								<p class="need-top">
									<span class="need-kind">{meta.label}</span>
									<a class="ref mono" href={taskHref(item.task)}>{item.task.repo}#{item.task.issue}</a>
									<span class="muted">{relTime(item.task.updatedAt)}</span>
								</p>
								<p class="need-title"><Inline text={item.task.title} /></p>
								<p class="need-text">{item.text}</p>
							</div>
							<Button size="sm" variant={item.kind === 'plan_approval' ? 'primary' : 'default'} href={meta.href ?? taskHref(item.task)}>{meta.action}</Button>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState icon={PartyPopper} title="Nothing needs you" text="Plan approvals, questions, paused sponsorships and red CI on your tasks show up here." />
			{/if}
		</Panel>

		<Panel title="Recent activity" flush>
			{#if activity.length}
				<ul class="feed">
					{#each activity as a (a.id)}
						<li class="tone-{a.tone ?? 'neutral'}">
							<span class="feed-dot" aria-hidden="true"></span>
							<p><strong>{a.actor}</strong> {a.text} <a class="mono" href={taskHref(a.task)}>{a.task.repo}#{a.task.issue}</a></p>
							<time class="muted" datetime={a.at}>{relTime(a.at)}</time>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState title="No activity yet" text="Stage changes, reviews and commands appear here as they happen." />
			{/if}
		</Panel>
	</div>

	<section aria-labelledby="targets-h">
		<h2 id="targets-h" class="section-title">Targets</h2>
		<div class="targets">
			{#each targets as target}
				{@const c = stageCounts(target, tasks)}
				<a class="target" href={targetHref(target)}>
					<div class="target-head">
						<span class="mono target-name">{target.owner}/{target.repo}</span>
						<Badge tone={target.mode === 'autonomous' ? 'accent' : 'neutral'}>{target.mode}</Badge>
					</div>
					<p class="target-desc">{target.description}</p>
					<ol class="pipeline" aria-label="Tasks per stage">
						{#each c.perStep as step}
							<li class:zero={!step.n}>
								<span class="pipe-n num">{step.n}</span>
								<span class="pipe-label">{step.label}</span>
							</li>
						{/each}
					</ol>
					<p class="target-foot num">
						<span>{c.total} tasks</span>
						{#if c.parked}<Badge plain meta={{ ...stageMeta.blocked, label: `${c.parked} parked` }} />{/if}
						<Badge plain tone="neutral" icon={CircleCheck}>{c.done} finished</Badge>
					</p>
				</a>
			{:else}
				<EmptyState title="No accessible targets" text="Targets appear here when you have write access to their upstream repository." />
			{/each}
		</div>
	</section>

	<p class="sponsor-note muted"><Avatar login={session.me.login} size={16} /> Signed in as {session.me.login}. “Needs you” lists tasks you can approve, answer or sponsor.</p>
{:catch error}
	<ErrorState {error} />
{/await}

<style>
	.tiles {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--s-3);
	}
	.tile {
		padding: var(--s-3) var(--s-4);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.tile-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-2);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
	}
	.tile-icon {
		display: flex;
		color: var(--tone-fg);
	}
	.tile-value {
		margin-top: var(--s-1);
		font-size: 1.75rem;
		font-weight: var(--fw-semibold);
		line-height: 1.15;
		letter-spacing: -0.02em;
	}
	.tile-hint {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: var(--s-4);
		align-items: start;
	}
	.needs,
	.feed {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.needs li {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		padding: var(--s-3) var(--s-4);
		border-bottom: 1px solid var(--border);
	}
	.needs li:last-child,
	.feed li:last-child {
		border-bottom: 0;
	}
	.need-icon {
		display: flex;
		flex: none;
		padding: 6px;
		border: 1px solid var(--tone-border);
		border-radius: var(--r-md);
		background: var(--tone-bg);
		color: var(--tone-fg);
	}
	.need-body {
		flex: 1;
		min-width: 0;
	}
	.need-top {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		font-size: var(--fs-xs);
	}
	.need-kind {
		color: var(--tone-fg);
		font-weight: var(--fw-semibold);
	}
	.need-title {
		font-weight: var(--fw-medium);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.need-text {
		color: var(--text-2);
		font-size: var(--fs-sm);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.feed li {
		display: flex;
		align-items: baseline;
		gap: var(--s-2);
		padding: var(--s-2) var(--s-4);
		border-bottom: 1px solid var(--border);
		font-size: var(--fs-sm);
	}
	.feed p {
		flex: 1;
		min-width: 0;
		color: var(--text-2);
	}
	.feed strong {
		color: var(--text);
		font-weight: var(--fw-medium);
	}
	.feed time {
		flex: none;
		font-size: var(--fs-xs);
	}
	.feed-dot {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--tone-solid);
		transform: translateY(-2px);
	}
	.section-title {
		margin-bottom: var(--s-3);
	}
	.targets {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--s-3);
	}
	.target {
		display: grid;
		gap: var(--s-2);
		padding: var(--s-4);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
		color: var(--text);
		transition: border-color var(--dur) var(--ease);
	}
	.target:hover {
		border-color: var(--border-strong);
		text-decoration: none;
	}
	.target-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-2);
	}
	.target-name {
		font-weight: var(--fw-semibold);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.target-desc {
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.pipeline {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 2px;
		margin: var(--s-1) 0 0;
		padding: 0;
		list-style: none;
	}
	.pipeline li {
		display: grid;
		gap: 2px;
		padding: 6px 4px;
		border-top: 2px solid var(--accent);
		background: var(--accent-soft);
		text-align: center;
	}
	.pipeline li:first-child {
		border-radius: 0 0 0 var(--r-sm);
	}
	.pipeline li:last-child {
		border-radius: 0 0 var(--r-sm) 0;
	}
	.pipeline li.zero {
		border-top-color: var(--border-strong);
		background: var(--surface-2);
	}
	.pipe-n {
		font-weight: var(--fw-semibold);
	}
	.zero .pipe-n {
		color: var(--text-3);
	}
	.pipe-label {
		color: var(--text-2);
		font-size: 0.625rem;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.target-foot {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.sponsor-note {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		font-size: var(--fs-xs);
	}
	@media (max-width: 1080px) {
		.split {
			grid-template-columns: minmax(0, 1fr);
		}
		.targets {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 760px) {
		.tiles {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.targets {
			grid-template-columns: minmax(0, 1fr);
		}
		.needs li {
			flex-wrap: wrap;
		}
		.need-body {
			flex-basis: calc(100% - 48px);
		}
		.need-title {
			white-space: normal;
		}
	}
</style>
