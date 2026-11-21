<script lang="ts">
	import { recoveryQueued } from '#lib/credentials.ts';
	import type { IssueIntent } from '#lib/types.ts';
	import { issueHref, relTime } from '#lib/format.ts';
	import Panel from './Panel.svelte';
	import Badge from './Badge.svelte';
	import DataTable from './DataTable.svelte';
	import Inline from './Inline.svelte';
	let { issues }: { issues: IssueIntent[] } = $props();
	const rows = $derived([...issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.issue - a.issue));
	const hasFunding = $derived(issues.some((issue) => issue.sponsorships));
</script>

{#if rows.length}
	<Panel flush title="Issues" meta={String(rows.length)}>
		<DataTable label="Issues">
			<thead><tr><th class="r">#</th><th>Issue</th><th>State</th><th>Labels</th>{#if hasFunding}<th>Funding</th>{/if}<th class="r">Updated</th></tr></thead>
			<tbody>
				{#each rows as issue (`${issue.owner}/${issue.repo}#${issue.issue}`)}
					<tr>
						<td class="r mono muted">{issue.issue}</td>
						<td class="title">
							<a href={issueHref(issue)}><Inline text={issue.title} /></a>
							<p class="sub"><span class="mono">{issue.owner}/{issue.repo}</span>{#if issue.author} · opened by {issue.author}{/if}</p>
						</td>
						<td class="nowrap"><Badge plain tone={issue.state === 'open' ? 'success' : 'neutral'}>{issue.state === 'open' ? 'Open' : issue.state === 'closed' ? 'Closed' : 'Unknown'}</Badge></td>
						<td><div class="labels">{#each issue.labels as label}<Badge plain tone="neutral">{label}</Badge>{:else}<span class="muted">—</span>{/each}</div></td>
						{#if hasFunding}<td>
							{#if issue.sponsorships}
								<Badge plain tone="neutral">{issue.sponsorships.status}</Badge>
								{#each Object.entries(issue.sponsorships.slots ?? {}) as [provider, slot]}{#if slot?.sponsor_id}<p class="sub">{provider}: @{slot.login ?? slot.sponsor_id}</p>{/if}{/each}
								{#if issue.sponsorships.calls !== undefined}<p class="sub">{issue.sponsorships.calls} charged task attempts · {issue.sponsorships.funding === 'org' ? 'organization funded' : 'historical payer attribution retained'}</p>{/if}
								{#if issue.sponsorships.task_stage === 'awaiting_credentials'}<Badge plain tone="warning">{recoveryQueued(issue.sponsorships.recovery) ? 'selecting a credential' : issue.sponsorships.recovery?.eligible ? 'waiting for credentials' : 'writer action required'}</Badge>{/if}
							{:else}<span class="muted">—</span>{/if}
						</td>{/if}
						<td class="r nowrap muted">{relTime(issue.updatedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</DataTable>
	</Panel>
{/if}

<style>
	.labels { display: flex; flex-wrap: wrap; gap: var(--s-1); }
</style>
