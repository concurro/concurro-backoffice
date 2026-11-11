<script lang="ts">
	import { CircleCheck, GitCompareArrows, ListOrdered, LockKeyhole, ShieldQuestion, TriangleAlert } from 'lucide-svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { duration, relTime } from '#lib/format.ts';
	import { roleLabel, stageMeta } from '#lib/meta.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { OperatorStatus, Tone } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let resolved = $state<string[]>([]);
	function resolve(id: string, applied: boolean) {
		resolved.push(id);
		toast(`${id} marked as ${applied ? 'applied' : 'not applied'}`);
	}

	const sessionTone: Record<OperatorStatus['sessions'][number]['state'], Tone> = { active: 'info', settled: 'success', expired: 'warning' };
</script>

<svelte:head><title>Operator · Concurro</title></svelte:head>

<PageHeader title="Operator" subtitle="Health of the Concurro service, its deployment and the model gateway." />

{#await data.result}
	<div class="tiles">{#each { length: 4 } as _}<div class="tile"><Skeleton rows={2} /></div>{/each}</div>
	<Panel title="Unknown GitHub writes"><Skeleton rows={3} /></Panel>
	<Panel title="Deployment drift"><Skeleton rows={3} /></Panel>
{:then op}
	{@const writes = op.unknownWrites.filter((w) => !resolved.includes(w.id))}
	{@const stale = op.leases.filter((l) => l.stale).length}
	{@const drifted = op.drift.filter((d) => !d.inSync).length}
	<div class="tiles">
		<div class="tile">
			<p class="tile-head">Service <Badge plain tone={op.service.healthy ? 'success' : 'danger'} icon={op.service.healthy ? CircleCheck : TriangleAlert}>{op.service.healthy ? 'Healthy' : 'Degraded'}</Badge></p>
			<p class="tile-value mono">{op.service.version}</p>
			<p class="tile-hint">up {op.service.uptime}</p>
		</div>
		<div class="tile">
			<p class="tile-head">Queue <ListOrdered size={15} aria-hidden="true" /></p>
			<p class="tile-value num">{op.queue.depth} <span>queued</span></p>
			<p class="tile-hint num">{op.queue.running}/{op.queue.capacity} running · oldest {duration(op.queue.oldestQueuedS * 1000)}</p>
		</div>
		<div class="tile">
			<p class="tile-head">Leases <LockKeyhole size={15} aria-hidden="true" /></p>
			<p class="tile-value num">{op.leases.length} <span>held</span></p>
			<p class="tile-hint">{#if stale}<Badge plain tone="warning" icon={TriangleAlert}>{stale} stale</Badge>{:else}None stale{/if}</p>
		</div>
		<div class="tile">
			<p class="tile-head">Unknown writes <ShieldQuestion size={15} aria-hidden="true" /></p>
			<p class="tile-value num">{writes.length} <span>to resolve</span></p>
			<p class="tile-hint">{#if drifted}<Badge plain tone="warning" icon={GitCompareArrows}>{drifted} target drifted</Badge>{:else}Deployment in sync{/if}</p>
		</div>
	</div>

	<Panel flush title="Unknown GitHub writes" meta={String(writes.length)}>
		{#if writes.length}
			<ul class="writes">
				{#each writes as w (w.id)}
					<li>
						<div>
							<p><span class="mono">{w.id}</span> · <strong>{w.kind}</strong> · <span class="mono">{w.task}</span> · <span class="muted">{relTime(w.at)}</span></p>
							<p class="detail">{w.detail}</p>
						</div>
						<div class="resolve">
							<Button size="sm" onclick={() => resolve(w.id, true)}>Mark applied</Button>
							<Button size="sm" onclick={() => resolve(w.id, false)}>Mark not applied</Button>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<EmptyState icon={CircleCheck} title="No unknown writes" text="Every GitHub write has a confirmed outcome." />
		{/if}
	</Panel>

	<Panel flush title="Deployment drift" meta="served engine vs. deployed workflow ref">
		<DataTable label="Deployment drift">
			<thead><tr><th>Target</th><th>Served engine</th><th>Workflow ref</th><th>Status</th><th>Note</th></tr></thead>
			<tbody>
				{#each op.drift as d}
					<tr>
						<td class="mono nowrap">{d.target}</td>
						<td class="mono">{d.servedEngine}</td>
						<td class="mono">{d.workflowRef}</td>
						<td class="nowrap"><Badge tone={d.inSync ? 'success' : 'warning'} icon={d.inSync ? CircleCheck : GitCompareArrows}>{d.inSync ? 'In sync' : 'Drift'}</Badge></td>
						<td class="sub">{d.note}</td>
					</tr>
				{/each}
			</tbody>
		</DataTable>
	</Panel>

	<div class="two">
		<Panel flush title="Leases" meta={String(op.leases.length)}>
			<DataTable label="Leases">
				<thead><tr><th>Lease</th><th>Task</th><th>Stage</th><th>Holder</th><th class="r">Expires</th></tr></thead>
				<tbody>
					{#each op.leases as l (l.id)}
						<tr>
							<td class="mono">{l.id}</td>
							<td class="mono nowrap">{l.task}</td>
							<td class="nowrap"><Badge plain meta={stageMeta[l.stage]} /></td>
							<td class="mono">{l.holder}</td>
							<td class="r nowrap">{#if l.stale}<Badge plain tone="warning" icon={TriangleAlert}>stale {duration(-l.expiresInS * 1000)}</Badge>{:else}in {duration(l.expiresInS * 1000)}{/if}</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		</Panel>

		<Panel flush title="Exchange sessions" meta={String(op.sessions.length)}>
			<DataTable label="Exchange sessions">
				<thead><tr><th>Session</th><th>Task</th><th>Role</th><th>Route</th><th>State</th><th class="r">Started</th></tr></thead>
				<tbody>
					{#each op.sessions as s (s.id)}
						<tr>
							<td class="mono">{s.id}</td>
							<td class="mono nowrap">{s.task}</td>
							<td class="nowrap">{roleLabel[s.role]}</td>
							<td class="mono">{s.route}</td>
							<td><Badge tone={sessionTone[s.state]}>{s.state}</Badge></td>
							<td class="r nowrap muted">{relTime(s.startedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		</Panel>
	</div>

	<Panel title="Gateway" meta="health and budgets per route">
		<div class="gateway">
			{#each op.gateway as g (g.route)}
				<div class="route">
					<p class="route-head"><span class="mono">{g.route}</span><Badge plain tone={g.healthy ? 'success' : 'danger'} icon={g.healthy ? CircleCheck : TriangleAlert}>{g.healthy ? 'Healthy' : 'Degraded'}</Badge></p>
					<p class="route-stats num muted">p50 {g.latencyMs.toLocaleString()} ms · {g.errorRate.toFixed(1)}% errors</p>
					<Meter label="Budget" used={g.budget.used} max={g.budget.max} unit={g.unit} />
				</div>
			{/each}
		</div>
	</Panel>
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
	.tile-value {
		margin-top: var(--s-1);
		font-size: var(--fs-xl);
		font-weight: var(--fw-semibold);
	}
	.tile-value span {
		color: var(--text-3);
		font-size: var(--fs-sm);
		font-weight: var(--fw-regular);
	}
	.tile-hint {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.writes {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.writes li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-4);
		padding: var(--s-3) var(--s-4);
		border-bottom: 1px solid var(--border);
		font-size: var(--fs-sm);
	}
	.writes li:last-child {
		border-bottom: 0;
	}
	.detail {
		color: var(--text-2);
	}
	.resolve {
		display: flex;
		flex: none;
		gap: var(--s-2);
	}
	.two {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--s-4);
		align-items: start;
	}
	.gateway {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--s-5);
	}
	.route-head {
		display: flex;
		justify-content: space-between;
		gap: var(--s-2);
		font-size: var(--fs-sm);
	}
	.route-stats {
		margin-bottom: var(--s-2);
		font-size: var(--fs-xs);
	}
	@media (max-width: 1100px) {
		.two {
			grid-template-columns: minmax(0, 1fr);
		}
		.gateway {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 760px) {
		.tiles {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.writes li {
			flex-direction: column;
			align-items: stretch;
		}
	}
	@media (max-width: 480px) {
		.gateway {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
