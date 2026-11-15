<script lang="ts">
	import { ArrowLeft, RefreshCw } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Prose from '#lib/components/Prose.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { ApiError } from '#lib/api/index.ts';
	import { absTime, reviewHref, shortSha } from '#lib/format.ts';
	import { findingStatusMeta, reviewVerdictMeta, severityTone } from '#lib/meta.ts';
	import type { Report, Severity } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();

	const review = $derived({ owner: params.owner, repo: params.repo, pr: Number(params.pr) });
	const report = $derived(data.resource.value?.report);
	const error = $derived(data.resource.error);
	const missing = $derived(error instanceof ApiError && error.status === 404);
	// Displayed while loading and after a failure too, so no live change is missed.
	$effect(() => data.resource.watch());

	type ReportFinding = Report['content']['findings'][number];
	function location(f: ReportFinding): string {
		if (!f.path) return 'General';
		if (f.line === null) return f.path;
		return `${f.path}:${f.start_line !== null && f.start_line !== f.line ? `${f.start_line}–` : ''}${f.line}`;
	}
</script>

<svelte:head><title>Report · {params.repo}#{params.pr} · Concurro</title></svelte:head>

{#snippet back()}
	<a class="back" href={reviewHref(review)}><ArrowLeft size={13} aria-hidden="true" /> <span class="mono">{review.owner}/{review.repo}#{review.pr}</span> review</a>
{/snippet}

{#if !report && error}
	<PageHeader title={missing ? 'Report not found' : 'Report unavailable'}>
		{#snippet eyebrow()}{@render back()}{/snippet}
	</PageHeader>
	<Alert tone="caution" title={missing ? 'No such report is recorded for this review' : 'This report could not be verified'}>
		{error instanceof Error ? error.message : 'The request failed.'}
		{#if !missing}
			Its stored evidence is missing or no longer matches what was recorded, so nothing is shown in its place. This is not an empty report.
		{/if}
		{#snippet actions()}<Button size="sm" icon={RefreshCw} onclick={data.resource.refresh}>Retry</Button>{/snippet}
	</Alert>
{:else if !report}
	<Skeleton rows={2} />
	<Panel title="Summary"><Skeleton rows={6} /></Panel>
	<Panel title="Findings"><Skeleton rows={4} /></Panel>
{:else}
	{@const { content } = report}
	{#if error}<ErrorState {error} retry={data.resource.refresh} />{/if}
	<PageHeader title={content.headline || report.title || `Report ${report.id}`}>
		{#snippet eyebrow()}{@render back()}{/snippet}
		<Badge meta={reviewVerdictMeta(content.verdict)} />
		<span class="fact">Reviewer <span class="mono">{report.reviewer}</span></span>
		<span class="fact">Model <span class="mono">{report.model}</span></span>
		{#if report.round !== null}<span class="fact">Round {report.round}</span>{/if}
		<span class="fact">Reviewed head <span class="mono" title={report.head}>{shortSha(report.head)}</span></span>
		{#if Number.isFinite(Date.parse(report.at))}<span class="muted when">{absTime(report.at)}</span>{/if}
	</PageHeader>

	<Panel title="Summary">
		<Prose text={content.summary} />
		<p class="note muted">A point-in-time assessment of <span class="mono">{shortSha(report.head)}</span>. Later changes to the pull request are not covered.</p>
	</Panel>

	<Panel title="Findings" meta={String(content.findings.length)} flush>
		{#if content.findings.length}
			<ol class="items">
				{#each content.findings as f, i}
					<li>
						<p class="item-head">
							{#if content.finding_ids?.[i]}<span class="mono id">{content.finding_ids[i]}</span>{/if}
							{#if f.severity}<Badge plain tone={severityTone[f.severity as Severity] ?? 'neutral'}>{f.severity}</Badge>{/if}
							<strong><Inline text={f.title || 'Untitled finding'} /></strong>
						</p>
						<p class="mono loc">{location(f)}</p>
						<Prose text={f.detail} />
					</li>
				{/each}
			</ol>
		{:else}
			<EmptyState title="No findings" text="This reviewer raised no new findings on the reviewed snapshot." />
		{/if}
	</Panel>

	<Panel title="Dispositions" meta={String(content.dispositions.length)} flush>
		{#if content.dispositions.length}
			<ol class="items">
				{#each content.dispositions as d}
					<li>
						<p class="item-head"><span class="mono id">{d.id}</span><Badge meta={findingStatusMeta(d.status)} /></p>
						<Prose text={d.evidence} />
					</li>
				{/each}
			</ol>
		{:else}
			<EmptyState title="No dispositions" text="This reviewer changed the status of no earlier finding." />
		{/if}
	</Panel>

	<p class="digest muted">Report <span class="mono">{report.id}</span> · evidence digest <span class="mono">{report.digest}</span></p>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.fact {
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.when {
		font-size: var(--fs-xs);
	}
	.note {
		margin-top: var(--s-3);
		font-size: var(--fs-xs);
	}
	.items {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.items li {
		display: grid;
		gap: var(--s-1);
		padding: var(--s-3) var(--s-4);
		border-bottom: 1px solid var(--border);
	}
	.items li:last-child {
		border-bottom: 0;
	}
	.item-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2);
		font-size: var(--fs-sm);
	}
	.id {
		color: var(--text-2);
	}
	.loc {
		color: var(--text-3);
		font-size: var(--fs-xs);
		overflow-wrap: anywhere;
	}
	.digest {
		font-size: var(--fs-xs);
		overflow-wrap: anywhere;
	}
</style>
