<script lang="ts">
	import { ExternalLink, FileText, GitPullRequest } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import FundingAudit from '#lib/components/FundingAudit.svelte';
	import ProviderSponsorship from '#lib/components/ProviderSponsorship.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import FindingsTable from '#lib/components/task/FindingsTable.svelte';
	import ReviewCommandBar from '#lib/components/task/ReviewCommandBar.svelte';
	import { actions as writes } from '#lib/api/index.ts';
	import { pullUrl, relTime, reportHref, shortSha, targetHref } from '#lib/format.ts';
	import { openFindings, pullStateMeta, reviewStageMeta, reviewVerdictMeta, roundOutcomeMeta } from '#lib/meta.ts';
	import { withBase } from '#lib/paths.ts';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();

	const task = $derived(data.resource.value?.task);
	// Displayed while loading and after a failure too, so no live change is missed.
	$effect(() => data.resource.watch());
	const rounds = $derived([...(task?.rounds ?? [])].sort((a, b) => b.round - a.round));
</script>

<svelte:head><title>{params.repo}#{params.pr} review · Concurro</title></svelte:head>

{#snippet sha(value: string)}
	{#if value}<span class="mono" title={value}>{shortSha(value)}</span>{:else}<span class="muted">—</span>{/if}
{/snippet}

{#snippet moved(changed: boolean)}
	{#if changed}<Badge plain tone="warning">changed</Badge>{/if}
{/snippet}

{#if !task && data.resource.error}
	<ErrorState error={data.resource.error} retry={data.resource.refresh} />
{:else if !task}
	<Skeleton rows={2} />
	<Skeleton height={64} />
	<div class="grid">
		<div class="col"><Panel title="Reviewed snapshot"><Skeleton rows={4} /></Panel><Panel title="Rounds"><Skeleton rows={6} /></Panel></div>
		<div class="col"><Panel title="Budget"><Skeleton rows={2} /></Panel></div>
	</div>
{:else}
	{@const { snapshot, observed, check } = task}
	{#if data.resource.error}<ErrorState error={data.resource.error} retry={data.resource.refresh} />{/if}
	<PageHeader title={task.title}>
		{#snippet eyebrow()}
			<a class="mono" href={targetHref(task)}>{task.owner}/{task.repo}</a>
			<span class="mono">#{task.pr}</span>
			<span>pull request by</span><Avatar login={task.author} size={18} label />
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" icon={ExternalLink} href={pullUrl(task)} external>GitHub</Button>
		{/snippet}
		<Badge meta={reviewStageMeta(task.stage)} />
		<Badge tone="neutral" icon={GitPullRequest}>Pull request review</Badge>
		{#if task.round}<span class="muted">Round {task.round}</span>{/if}
		<span class="muted updated">Updated {relTime(task.updatedAt)}</span>
	</PageHeader>

	<Alert tone={task.alert.tone} title={task.alert.title}>
		<Inline text={task.alert.body} />
		{#snippet actions()}
			{#if task.stage === 'awaiting_credentials'}<Button size="sm" href={withBase('/me/credentials')}>Fix credentials</Button>{/if}
		{/snippet}
	</Alert>

	{#if task.changedSinceReview}
		<Alert tone="warning" title="The pull request changed after the reviewed snapshot">
			The verdicts, findings and reports on this page describe the snapshot at <span class="mono">{shortSha(snapshot.head)}</span> only.
			Later changes to the pull request have not been reviewed and do not extend this round.
			Request the <span class="mono">ConcurroBot</span> reviewer again on the pull request for a new assessment.
		</Alert>
	{/if}

	<div class="grid">
		<div class="col">
			<div class="pair">
				<Panel title="Reviewed snapshot" meta={task.round ? `round ${task.round}` : undefined}>
					{#if snapshot.head}
						<dl class="facts">
							<dt>Head</dt><dd>{@render sha(snapshot.head)}</dd>
							<dt>Base branch</dt><dd class="mono">{snapshot.baseRef}</dd>
							<dt>Merge base</dt><dd>{@render sha(snapshot.base)}</dd>
							<dt>Base tip</dt><dd>{@render sha(snapshot.baseTip)}</dd>
							<dt>Title</dt><dd><Inline text={snapshot.title} /></dd>
						</dl>
						<p class="note muted">What the reviewers assessed. A finished round never changes.</p>
					{:else}
						<p class="muted">No snapshot has been taken yet.</p>
					{/if}
				</Panel>
				<Panel title="Pull request now">
					<dl class="facts">
						<dt>Head</dt><dd>{@render sha(observed.head)} {@render moved(!!snapshot.head && observed.head !== snapshot.head)}</dd>
						<dt>Base branch</dt><dd><span class="mono">{observed.baseRef}</span> {@render moved(!!snapshot.head && observed.baseRef !== snapshot.baseRef)}</dd>
						<dt>Base tip</dt><dd>{@render sha(observed.baseTip)} {@render moved(!!snapshot.head && observed.baseTip !== snapshot.baseTip)}</dd>
						<dt>Title</dt><dd><Inline text={observed.title} /> {@render moved(!!snapshot.head && observed.title !== snapshot.title)}</dd>
						<dt>State</dt><dd><Badge plain meta={pullStateMeta(observed)} /></dd>
					</dl>
					<p class="note muted">As GitHub last reported it{task.changedSinceReview ? '; not covered by the review' : ''}.</p>
				</Panel>
			</div>

			<Panel title="Rounds" meta={String(rounds.length)} flush id="rounds">
				{#if rounds.length}
					<ol class="rounds">
						{#each rounds as round (round.round)}
							<li>
								<div class="round-head">
									<strong>Round {round.round}</strong>
									<Badge plain meta={roundOutcomeMeta(round.outcome)} />
									<span class="snap">snapshot {@render sha(round.head)}</span>
									<span class="muted when">
										{#if round.requestedBy}Requested by @{round.requestedBy}{/if}
										{#if Number.isFinite(Date.parse(round.requestedAt))}<time datetime={round.requestedAt}>{relTime(round.requestedAt)}</time>{/if}
									</span>
								</div>
								<ul class="reviewers">
									{#each round.reviewers as r (r.reviewer)}
										<li>
											<span class="mono agent">{r.reviewer}</span>
											<span class="mono muted">{r.model}</span>
											<Badge meta={reviewVerdictMeta(r.verdict)} />
											{#if r.reportId}<a class="report" href={reportHref(task, r.reportId)}><FileText size={13} aria-hidden="true" /> Full report</a>{/if}
										</li>
									{:else}
										<li class="muted">No reviewers were assigned.</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ol>
				{:else}
					<EmptyState icon={GitPullRequest} title="No rounds yet" text="A round opens when a maintainer requests the ConcurroBot reviewer on the pull request." />
				{/if}
			</Panel>

			<Panel title="Findings" meta="{openFindings(task.findings)} open of {task.findings.length}" flush id="findings">
				<FindingsTable
					findings={task.findings}
					none="Reviewers raised no findings on the reviewed snapshots."
					rule="Only the reviewer who raised a finding can mark it fixed or obsolete, and only in a later round."
				/>
			</Panel>
			{#if task.sponsorships && task.sponsorships.scope !== 'own'}<FundingAudit projection={task.sponsorships} />{/if}
		</div>
		<div class="col">
			<Panel title="Budget" id="budgets">
				<Meter label="Model calls" {...task.budgets.modelCalls} />
			</Panel>
			<Panel title="GitHub check" id="check">
				<p class="check">
					<Badge plain tone={check.published ? 'success' : 'neutral'}>{check.published ? 'Published' : 'Not published'}</Badge>
					{#if check.pending}<Badge plain tone="warning">Update pending</Badge>{/if}
					{#if check.completed}<Badge plain tone="neutral">Finished</Badge>{/if}
				</p>
				{#if check.round !== null}<p class="note muted">Check run for round {check.round}{#if check.attempt !== null}, attempt {check.attempt}{/if}.</p>{/if}
			</Panel>
			<ProviderSponsorship
				issue={{ owner: task.owner, repo: task.repo, issue: task.pr }}
				post={writes.reviewCommand}
				refresh={data.resource.refresh}
				projection={task.sponsorships}
				writer={data.resource.value?.issueWriter ?? false}
			/>
		</div>
	</div>

	{#if data.resource.value?.issueWriter}<ReviewCommandBar {task} />{/if}
{/if}

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
	.pair {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--s-4);
		align-items: start;
	}
	.updated {
		font-size: var(--fs-xs);
	}
	.facts {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--s-1) var(--s-4);
		margin: 0;
		font-size: var(--fs-sm);
	}
	.facts dt {
		color: var(--text-3);
	}
	.facts dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.note {
		margin-top: var(--s-3);
		font-size: var(--fs-xs);
	}
	.rounds,
	.reviewers {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.rounds > li {
		display: grid;
		gap: var(--s-2);
		padding: var(--s-3) var(--s-4);
		border-bottom: 1px solid var(--border);
	}
	.rounds > li:last-child {
		border-bottom: 0;
	}
	.round-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2) var(--s-3);
		font-size: var(--fs-sm);
	}
	.snap {
		color: var(--text-2);
	}
	.when {
		margin-left: auto;
		font-size: var(--fs-xs);
	}
	.reviewers {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2);
	}
	.reviewers li {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-1) var(--s-2);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		font-size: var(--fs-sm);
	}
	.agent {
		font-weight: var(--fw-semibold);
	}
	.report {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.check {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2) var(--s-3);
	}
	@media (max-width: 1100px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 760px) {
		.pair {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
