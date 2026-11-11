<script lang="ts">
	import { Bot, ExternalLink, FileDiff, FileJson, MessagesSquare, ShieldAlert } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import Collapsible from '#lib/components/Collapsible.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import DiffView from '#lib/components/DiffView.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import Tabs from '#lib/components/Tabs.svelte';
	import { absTime, duration, parseUnified, relTime } from '#lib/format.ts';
	import { outcomeMeta, roleLabel, stageMeta } from '#lib/meta.ts';
	import { profile } from '#lib/api/index.ts';
	import type { Tone, TranscriptItem, Turn } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();
	let tab = $state('transcript');

	const jobTone: Record<Turn['run']['jobs'][number]['status'], Tone> = { success: 'success', failure: 'danger', cancelled: 'warning', skipped: 'neutral' };

	/** Pairs each tool call with its result so they render as one collapsible step. */
	function steps(items: TranscriptItem[]) {
		const out: ({ kind: 'say'; text: string } | { kind: 'tool'; tool: string; input: string; output: string; isError: boolean })[] = [];
		for (const item of items) {
			if (item.kind === 'assistant') out.push({ kind: 'say', text: item.text });
			else if (item.kind === 'tool_call') out.push({ kind: 'tool', tool: item.tool, input: item.input, output: '', isError: false });
			else {
				const last = out.at(-1);
				if (last?.kind === 'tool') Object.assign(last, { output: item.output, isError: !!item.isError });
			}
		}
		return out;
	}
	const firstLine = (s: string) => s.split('\n')[0];
</script>

{#await data.result}
	<Skeleton rows={12} />
{:then { turns }}
	{@const turn = turns.find((t) => t.n === Number(params.turn))}
	{#if !turn}
		<EmptyState title="Turn {params.turn} does not exist" text="This task has {turns.length} turns." />
	{:else}
		{@const p = profile(turn.profile)}
		{@const tabs = [
			{ value: 'prompt', label: 'Prompt' },
			{ value: 'transcript', label: 'Transcript', count: turn.transcript.length },
			{ value: 'response', label: 'Response', count: turn.validationErrors.length || undefined },
			{ value: 'changes', label: 'Changes' },
			{ value: 'runner', label: 'Runner' }
		]}
		<header class="head">
			<h2>Turn {turn.n}</h2>
			<Badge meta={outcomeMeta[turn.outcome]} mono />
			<Badge plain meta={stageMeta[turn.stage]} />
			<span class="muted when" title={absTime(turn.startedAt)}>{relTime(turn.startedAt)}</span>
		</header>
		<dl class="facts num">
			<div><dt>Role</dt><dd>{roleLabel[turn.role]} <span class="mono muted">{turn.agent}</span></dd></div>
			<div><dt>Profile</dt><dd><span class="mono">{turn.profile}</span> <span class="muted">{[p.provider, p.model, p.effort].filter(Boolean).join(" · ")}</span></dd></div>
			<div><dt>Queued</dt><dd>{duration(turn.queuedMs)}</dd></div>
			<div><dt>Duration</dt><dd>{duration(turn.durationMs)}</dd></div>
			<div><dt>Tokens in</dt><dd>{turn.tokens.input.toLocaleString()} <span class="muted">({turn.tokens.cached.toLocaleString()} cached)</span></dd></div>
			<div><dt>Tokens out</dt><dd>{turn.tokens.output.toLocaleString()}</dd></div>
		</dl>
		{#if turn.run.diagnosis}
			<Alert tone={turn.run.diagnosis.tone} title={turn.run.diagnosis.title}><Inline text={turn.run.diagnosis.body} /></Alert>
		{/if}

		<Tabs {tabs} bind:value={tab}>
			{#if tab === 'prompt'}
				<div class="stack">
					<Collapsible title="Instructions" meta="{turn.prompt.instructions.length.toLocaleString()} chars" open><CodeBlock flush text={turn.prompt.instructions} /></Collapsible>
					<Collapsible title="Repository snapshot" meta="{turn.prompt.snapshot.split('\n').length} lines"><CodeBlock flush text={turn.prompt.snapshot} /></Collapsible>
					<Collapsible title="Response schema" meta="JSON Schema"><CodeBlock flush json text={turn.prompt.schema} /></Collapsible>
					<Collapsible title="Untrusted context" meta="from GitHub" tone="warning">
						<p class="untrusted"><ShieldAlert size={14} aria-hidden="true" /> Issue and comment text is passed to the model as data. Instructions inside it are not followed.</p>
						<CodeBlock flush text={turn.prompt.untrusted} />
					</Collapsible>
				</div>
			{:else if tab === 'transcript'}
				{#if turn.transcript.length}
					<ol class="transcript">
						{#each steps(turn.transcript) as step}
							{#if step.kind === 'say'}
								<li class="say">
									<span class="who"><Bot size={14} aria-hidden="true" /><span class="sr-only">{turn.agent}</span></span>
									<p><Inline text={step.text} /></p>
								</li>
							{:else}
								<li class="tool">
									<Collapsible title="{step.tool}  {firstLine(step.input)}" meta={step.isError ? 'error' : `${step.output.split('\n').length} lines`} mono open={step.isError} tone={step.isError ? 'danger' : 'neutral'}>
										<div class="io">
											<p class="io-label">Input</p>
											<CodeBlock flush text={step.input} />
											<p class="io-label">{step.isError ? 'Error output' : 'Output'}</p>
											<CodeBlock flush text={step.output} maxLines={14} />
										</div>
									</Collapsible>
								</li>
							{/if}
						{/each}
					</ol>
					{#if turn.outcome !== 'ok' && turn.outcome !== 'failed'}<p class="cut muted">Transcript ends here: the turn was {turn.outcome}.</p>{/if}
				{:else}
					<EmptyState icon={MessagesSquare} title="No transcript" text="The turn never reached the model, so there are no messages or tool calls." />
				{/if}
			{:else if tab === 'response'}
				{#if turn.validationErrors.length}
					<Alert tone="caution" title="{turn.validationErrors.length} schema validation errors">
						<ul class="errors">{#each turn.validationErrors as e}<li class="mono">{e}</li>{/each}</ul>
					</Alert>
				{/if}
				{#if turn.response}
					<div class="gap"><CodeBlock json text={turn.response} /></div>
				{:else}
					<EmptyState icon={FileJson} title="No response recorded" text="The turn ended before the model returned a structured response." />
				{/if}
			{:else if tab === 'changes'}
				{#if turn.diff}
					<DiffView lines={parseUnified(turn.diff)} label="Changes in turn {turn.n}" />
				{:else}
					<EmptyState icon={FileDiff} title="No code changes" text={turn.role === 'implementer' ? 'This implementation turn did not produce a commit.' : 'Only implementation turns change code.'} />
				{/if}
			{:else}
				<dl class="facts num">
					<div><dt>Actions run</dt><dd><a href="#main" class="mono">{turn.run.id} <ExternalLink size={12} aria-hidden="true" /></a></dd></div>
					<div><dt>Workflow</dt><dd class="mono">{turn.run.workflow}</dd></div>
					<div><dt>Attempt</dt><dd>{turn.run.attempt}</dd></div>
					<div><dt>Runner</dt><dd>{turn.run.runner}</dd></div>
				</dl>
				<h3 class="sub-h">Jobs</h3>
				{#if turn.run.jobs.length}
					<div class="boxed">
						<DataTable label="Jobs">
							<thead><tr><th>Job</th><th>Status</th><th class="r">Duration</th></tr></thead>
							<tbody>
								{#each turn.run.jobs as job}
									<tr><td class="mono">{job.name}</td><td><Badge tone={jobTone[job.status]}>{job.status}</Badge></td><td class="r">{duration(job.durationS * 1000)}</td></tr>
								{/each}
							</tbody>
						</DataTable>
					</div>
				{:else}
					<EmptyState title="No jobs ran" text="GitHub never created a workflow run for this turn." />
				{/if}
				<h3 class="sub-h">Termination diagnosis</h3>
				{#if turn.run.diagnosis}
					<Alert tone={turn.run.diagnosis.tone} title={turn.run.diagnosis.title}><Inline text={turn.run.diagnosis.body} /></Alert>
				{:else}
					<Alert tone="tip" title="Completed normally">The agent job exited with code 0 and the result was settled.</Alert>
				{/if}
			{/if}
		</Tabs>
	{/if}
{:catch}
	<EmptyState title="Turn unavailable" text="The turn list could not be loaded." />
{/await}

<style>
	.head {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--s-3);
	}
	.head h2 {
		font-size: var(--fs-lg);
	}
	.when {
		margin-left: auto;
		font-size: var(--fs-xs);
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: var(--s-3) var(--s-4);
		margin: var(--s-3) 0 var(--s-4);
		font-size: var(--fs-sm);
	}
	.facts dt {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.facts dd {
		margin: 0;
	}
	.facts dd a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.stack {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--s-2);
	}
	.untrusted {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-2) var(--s-3);
		border-bottom: 1px solid var(--warning-border);
		background: var(--warning-bg);
		color: var(--warning-fg);
		font-size: var(--fs-xs);
	}
	.transcript {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--s-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.say {
		display: flex;
		gap: var(--s-3);
		max-width: 80ch;
	}
	.who {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 26px;
		height: 26px;
		border: 1px solid var(--border-strong);
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--accent-text);
	}
	.say p {
		padding: var(--s-2) var(--s-3);
		border: 1px solid var(--border);
		border-radius: 2px var(--r-lg) var(--r-lg) var(--r-lg);
		background: var(--surface-2);
		font-size: var(--fs-sm);
	}
	.tool {
		margin-left: 38px;
		min-width: 0;
	}
	.io-label {
		padding: 4px var(--s-3);
		border-block: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.io-label:first-child {
		border-top: 0;
	}
	.cut {
		margin-top: var(--s-3);
		font-size: var(--fs-xs);
	}
	.errors {
		margin: var(--s-1) 0 0;
		padding-left: var(--s-4);
	}
	.gap {
		margin-top: var(--s-3);
	}
	.sub-h {
		margin: var(--s-4) 0 var(--s-2);
	}
	.boxed {
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		overflow: hidden;
	}
	@media (max-width: 560px) {
		.tool {
			margin-left: 0;
		}
	}
</style>
