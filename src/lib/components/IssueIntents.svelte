<script lang="ts">
	import type { IssueIntent } from '#lib/types.ts';
	import { issueHref } from '#lib/format.ts';
	import Panel from './Panel.svelte';
	import Badge from './Badge.svelte';
	let { issues }: { issues: IssueIntent[] } = $props();
</script>
{#if issues.length}
	<Panel title="Issue provider consent" meta="provider consent">
		<ul>{#each issues as issue}<li><a href={issueHref(issue)}>{issue.owner}/{issue.repo}#{issue.issue} · {issue.title}</a><Badge plain tone="neutral">{issue.sponsorships?.status ?? 'pending'}</Badge>{#each Object.entries(issue.sponsorships?.slots ?? {}) as [provider, slot]}{#if slot?.sponsor_id}<span>{provider}: @{slot.login ?? slot.sponsor_id}</span>{/if}{/each}</li>{/each}</ul>
	</Panel>
{/if}
<style>
	ul { display: grid; gap: var(--s-3); list-style: none; padding: 0; margin: 0; }
	li { display: flex; flex-wrap: wrap; gap: var(--s-2); font-size: var(--fs-sm); }
	span { color: var(--text-2); }
</style>
