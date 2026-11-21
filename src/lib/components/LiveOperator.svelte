<script lang="ts">
    import { CircleCheck, TriangleAlert } from 'lucide-svelte';
    import Alert from '#lib/components/Alert.svelte';
    import Badge from '#lib/components/Badge.svelte';
    import DataTable from '#lib/components/DataTable.svelte';
    import EmptyState from '#lib/components/EmptyState.svelte';
    import PageHeader from '#lib/components/PageHeader.svelte';
    import Panel from '#lib/components/Panel.svelte';
    import { relTime, taskHref } from '#lib/format.ts';
    import { withBase } from '#lib/paths.ts';
    import type { LiveOperatorStatus } from '#lib/types.ts';

    let { op }: { op: LiveOperatorStatus } = $props();
    const pending = $derived(['pending', 'ready', 'sending', 'queued'].reduce((sum, key) => sum + (op.turns?.[key] ?? 0), 0));
    const running = $derived(op.turns?.running ?? 0);
    const unknown = $derived(op.turns?.unknown_outcome ?? 0);
</script>

<PageHeader title="Operator" subtitle="Read API and task operations for issues you can administer." />
<Alert tone="note" title="Read-only operational view">Operator actions run on the host. Counts come from the durable read model; gateway health, deployment drift, leases and the live request queue are unavailable here.</Alert>
<div class="tiles">
    <Panel title="Read model">
        <Badge tone={op.projection.ready ? 'success' : 'warning'} icon={op.projection.ready ? CircleCheck : TriangleAlert}>{op.projection.ready ? 'Baseline ready' : 'Loading baseline'}</Badge>
        <p class="sub">Revision <span class="mono">{op.projection.revision}</span></p>
    </Panel>
    <Panel title="Buffered events">
        <p class="value num">{op.projection.buffered_events}</p>
        <p class="sub">Received but not applied · broker backlog unavailable</p>
    </Panel>
    <Panel title="Visible tasks">
        <p class="value num">{op.tasks?.length ?? '—'}</p>
        <p class="sub">{op.tasks ? `${op.stages?.blocked ?? 0} blocked` : 'Waiting for baseline'}</p>
    </Panel>
    <Panel title="Unfinished turns">
        <p class="value num">{op.turns ? pending + running : '—'}</p>
        <p class="sub">{op.turns ? `${pending} pending · ${running} running` : 'Waiting for baseline'}</p>
        {#if op.turns}<p class="sub">{unknown} unknown outcomes</p>{/if}
    </Panel>
</div>
<Panel title="Projection observations">
    <p class="sub">Read {relTime(op.observed_at)} · last received event {op.projection.last_event_at ? relTime(op.projection.last_event_at) : 'unavailable'}</p>
    <p class="sub">A ready baseline and zero buffered events do not establish task-service, broker or gateway health. This page is a snapshot; reload to update.</p>
</Panel>
{#if op.tasks}
    <Panel title="Task stages">
        <div class="stages">{#each Object.entries(op.stages ?? {}) as [stage, count]}<Badge tone={stage === 'blocked' ? 'warning' : 'neutral'}>{stage} · {count}</Badge>{/each}</div>
        {#if !op.tasks.length}<EmptyState title="No visible tasks" text="No projected tasks currently have issue-specific writer access for your account." />{/if}
    </Panel>
    {#if op.tasks.length}
        <Panel flush title="Task operations" meta={String(op.tasks.length)}>
            <DataTable label="Task operations">
                <thead><tr><th>Task</th><th>Stage</th><th>Reason</th><th>Turn observations</th></tr></thead>
                <tbody>{#each op.tasks as task (task.id)}
                    {@const [owner, repo] = task.repository.split('/')}
                    <tr>
                        <td><a href={task.kind === 'standalone_pr_review' ? withBase(`/reviews/${owner}/${repo}/${task.issue_number}`) : taskHref({ owner, repo, issue: task.issue_number })}>{task.repository}#{task.issue_number}</a><p class="sub">{task.title ?? task.kind}</p></td>
                        <td><Badge tone={task.stage === 'blocked' ? 'warning' : 'neutral'}>{task.stage}</Badge></td>
                        <td class="sub">{task.reason ?? '—'}</td>
                        <td class="sub">{Object.entries(task.turns).map(([state, count]) => `${count} ${state.replaceAll('_', ' ')}`).join(' · ') || 'None projected'}</td>
                    </tr>
                {/each}</tbody>
            </DataTable>
        </Panel>
    {/if}
{/if}

<style>
    .tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--s-3); }
    .value { font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
    .stages { display: flex; gap: var(--s-2); flex-wrap: wrap; }
    @media (max-width: 1000px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 550px) { .tiles { grid-template-columns: minmax(0, 1fr); } }
</style>
