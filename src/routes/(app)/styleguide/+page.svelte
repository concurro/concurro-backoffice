<script lang="ts">
	import { Play, Trash2 } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import StageStepper from '#lib/components/StageStepper.svelte';
	import { ciMeta, credentialMeta, findingMeta, mergedEarlyMeta, outcomeMeta, stageMeta, taskStageMeta, verdictMeta } from '#lib/meta.ts';
	import { tasks } from '#lib/mock/tasks.ts';
	import type { AlertTone } from '#lib/types.ts';

	let open = $state(false);
	let danger = $state(false);

	const swatches = {
		Surfaces: ['bg', 'surface', 'surface-2', 'surface-3', 'code-bg'],
		Borders: ['border', 'border-strong'],
		Text: ['text', 'text-2', 'text-3', 'text-disabled'],
		Accent: ['accent', 'accent-hover', 'accent-soft', 'accent-text', 'focus-ring']
	};
	const statuses = ['success', 'warning', 'danger', 'info', 'neutral'];
	const scales = {
		Spacing: ['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7'],
		Radius: ['r-sm', 'r-md', 'r-lg', 'r-full']
	};
	const type = [
		['fs-2xl', 'Display 24 / semibold'],
		['fs-xl', 'Page title 20 / semibold'],
		['fs-lg', 'Dialog title 16 / semibold'],
		['fs-md', 'Body 14 / regular'],
		['fs-sm', 'Table and secondary 13'],
		['fs-xs', 'Caption 12'],
		['fs-2xs', 'OVERLINE 11']
	];
	const alerts: [AlertTone, string, string][] = [
		['note', 'PR review round 2 is in progress', 'No action is needed from you.'],
		['tip', 'Ready for humans', 'All reviewers approve the current head and CI is green.'],
		['warning', 'Input needed', 'Triage asked a question on the issue.'],
		['caution', 'Paused: awaiting credentials', 'Replace the exhausted key, then resume.']
	];
	const stepperTasks = [tasks.find((t) => t.stage === 'review')!, tasks.find((t) => t.stage === 'blocked')!];
</script>

<svelte:head><title>Styleguide · Concurro</title></svelte:head>

<PageHeader title="Styleguide" subtitle="Tokens and components in both themes. Every component reads only the CSS custom properties in tokens.css." />

{#snippet specimens()}
	<section>
		<h2>Color tokens</h2>
		{#each Object.entries(swatches) as [group, names]}
			<h3>{group}</h3>
			<div class="swatches">
				{#each names as name}<div class="swatch"><span class="chip" style:background="var(--{name})"></span><code>--{name}</code></div>{/each}
			</div>
		{/each}
		<h3>Status (fg · bg · border · solid)</h3>
		<div class="status-grid">
			{#each statuses as s}
				<div class="status-row">
					<span class="status-sample" style:color="var(--{s}-fg)" style:background="var(--{s}-bg)" style:border-color="var(--{s}-border)">
						<span class="status-dot" style:background="var(--{s}-solid)"></span>{s}
					</span>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2>Spacing and radius</h2>
		<div class="scales">
			{#each scales.Spacing as s}<div class="scale"><span class="space" style:width="var(--{s})"></span><code>--{s}</code></div>{/each}
		</div>
		<div class="scales">
			{#each scales.Radius as r}<div class="scale"><span class="radius" style:border-radius="var(--{r})"></span><code>--{r}</code></div>{/each}
		</div>
	</section>

	<section>
		<h2>Typography</h2>
		{#each type as [token, label]}<p style:font-size="var(--{token})" class:strong={token.includes('xl') || token === 'fs-lg'}>{label}</p>{/each}
		<p class="mono">Mono: e7b20d3 · pl_c41f9e · opus55-high · 23/48</p>
		<p class="num">Tabular numerals: 1,204,118 · 0.71 · 18m 28s</p>
	</section>

	<section>
		<h2>Badges</h2>
		<h3>Stage</h3>
		<div class="wrap">{#each [...Object.entries(stageMeta).filter(([stage]) => stage !== 'merged').map(([, meta]) => meta), mergedEarlyMeta] as meta}<Badge {meta} />{/each}</div>
		<h3>Turn outcome</h3>
		<div class="wrap">{#each Object.values(outcomeMeta) as meta}<Badge {meta} mono />{/each}</div>
		<h3>Verdict, finding, CI, credential</h3>
		<div class="wrap">
			{#each [...Object.values(verdictMeta), ...Object.values(findingMeta)] as meta}<Badge {meta} />{/each}
		</div>
		<div class="wrap">
			{#each [...Object.values(ciMeta), ...Object.values(credentialMeta)] as meta}<Badge plain {meta} />{/each}
			<Avatar login="mkeller" label />
		</div>
	</section>

	<section>
		<h2>Alerts</h2>
		<div class="stack">{#each alerts as [tone, title, body]}<Alert {tone} {title}>{body}</Alert>{/each}</div>
	</section>

	<section>
		<h2>Buttons</h2>
		<div class="wrap">
			<Button variant="primary">Primary</Button>
			<Button>Default</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="danger" icon={Trash2}>Danger</Button>
			<Button variant="danger-solid">Destructive</Button>
			<Button disabled>Disabled</Button>
		</div>
		<div class="wrap">
			<Button size="sm" variant="primary" icon={Play}>Small primary</Button>
			<Button size="sm">Small</Button>
			<Button size="sm" variant="danger">Small danger</Button>
		</div>
	</section>

	<section>
		<h2>Stage stepper</h2>
		<div class="stack">{#each stepperTasks as task}<StageStepper {task} />{/each}</div>
	</section>

	<section>
		<h2>Table</h2>
		<div class="boxed">
			<DataTable label="Sample">
				<thead><tr><th class="r">#</th><th>Issue</th><th>Stage</th><th class="r">Calls</th></tr></thead>
				<tbody>
					{#each tasks.slice(0, 4) as t}
						<tr><td class="r mono muted">{t.issue}</td><td class="title"><a href="#main">{t.title}</a><p class="sub mono">{t.repo}</p></td><td><Badge meta={taskStageMeta(t)} /></td><td class="r">{t.budgets.modelCalls.used}/{t.budgets.modelCalls.max}</td></tr>
					{/each}
				</tbody>
			</DataTable>
		</div>
	</section>

	<section>
		<h2>Meters, code, loading and empty</h2>
		<div class="stack">
			<Meter label="Model calls" used={23} max={48} />
			<Meter label="Fix rounds" used={4} max={4} />
			<CodeBlock json text={'{\n  "verdict": "approve",\n  "findings": [],\n  "dispositions": [{ "id": "F-3", "status": "fixed" }],\n  "line": 128,\n  "design_issue": null\n}'} />
			<Skeleton rows={3} />
			<div class="boxed"><EmptyState title="Nothing here yet" text="Each list has an empty state with one line of guidance." /></div>
		</div>
	</section>

	<section>
		<h2>Dialog</h2>
		<div class="dialog-static">
			<p class="d-title">Invalidate this task?</p>
			<p class="d-text">Assessment restarts from intake. Plans, approvals and findings are discarded.</p>
			<div class="d-foot"><Button size="sm">Cancel</Button><Button size="sm" variant="danger-solid">Invalidate task</Button></div>
		</div>
		<div class="wrap">
			<Button onclick={() => { danger = false; open = true; }}>Open confirm dialog</Button>
			<Button variant="danger" onclick={() => { danger = true; open = true; }}>Open destructive dialog</Button>
		</div>
	</section>
{/snippet}

<div class="themes">
	{#each ['light', 'dark'] as t}
		<div class="theme" data-theme={t}>
			<p class="theme-name">{t}</p>
			{@render specimens()}
		</div>
	{/each}
</div>

<Modal bind:open title={danger ? 'Invalidate this task?' : 'Resume this task?'} description={danger ? 'This discards work and cannot be undone.' : 'The task continues from where it stopped.'}>
	{#snippet footer()}
		<Button onclick={() => (open = false)}>Cancel</Button>
		<Button variant={danger ? 'danger-solid' : 'primary'} onclick={() => (open = false)}>{danger ? 'Invalidate task' : 'Resume'}</Button>
	{/snippet}
</Modal>

<style>
	.themes {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--s-4);
		align-items: start;
	}
	.theme {
		display: grid;
		gap: var(--s-5);
		padding: var(--s-4);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		min-width: 0;
	}
	.theme-name {
		color: var(--text-3);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	section {
		display: grid;
		gap: var(--s-2);
		min-width: 0;
	}
	h2 {
		padding-bottom: var(--s-1);
		border-bottom: 1px solid var(--border);
	}
	h3 {
		margin-top: var(--s-2);
		color: var(--text-3);
		font-size: var(--fs-xs);
		font-weight: var(--fw-medium);
	}
	.swatches,
	.wrap,
	.scales,
	.status-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2) var(--s-3);
		align-items: center;
	}
	.swatch,
	.scale {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-2);
		font-size: var(--fs-xs);
	}
	.chip {
		width: 22px;
		height: 22px;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-sm);
	}
	.status-sample {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid;
		border-radius: var(--r-md);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
	}
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.space {
		height: 12px;
		background: var(--accent);
		border-radius: 1px;
	}
	.radius {
		width: 28px;
		height: 20px;
		border: 1px solid var(--border-strong);
		background: var(--surface);
	}
	.strong {
		font-weight: var(--fw-semibold);
	}
	.stack {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--s-3);
		min-width: 0;
	}
	.boxed {
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
		overflow: hidden;
	}
	.dialog-static {
		max-width: 400px;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-lg);
		background: var(--surface);
		box-shadow: var(--shadow-overlay);
	}
	.d-title {
		padding: var(--s-4) var(--s-4) 0;
		font-size: var(--fs-lg);
		font-weight: var(--fw-semibold);
	}
	.d-text {
		padding: var(--s-1) var(--s-4) var(--s-4);
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.d-foot {
		display: flex;
		justify-content: flex-end;
		gap: var(--s-2);
		padding: var(--s-3) var(--s-4);
		border-top: 1px solid var(--border);
		background: var(--surface-2);
		border-radius: 0 0 var(--r-lg) var(--r-lg);
	}
	@media (max-width: 1000px) {
		.themes {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
