<script lang="ts">
	import { relTime, reviewHref } from '#lib/format.ts';
	import { pullStateMeta } from '#lib/meta.ts';
	import type { ReviewSummary } from '#lib/types.ts';
	import Badge from './Badge.svelte';
	import DataTable from './DataTable.svelte';
	import Inline from './Inline.svelte';
	import Panel from './Panel.svelte';

	let { reviews }: { reviews: ReviewSummary[] } = $props();
</script>

{#if reviews.length}
	<Panel flush title="Pull request reviews" meta={String(reviews.length)}>
		<DataTable label="Pull request reviews">
			<thead><tr><th>Pull request</th><th>State</th><th>Head</th><th class="r">Updated</th></tr></thead>
			<tbody>
				{#each reviews as review (`${review.owner}/${review.repo}#${review.pr}`)}
					<tr>
						<td class="title">
							<a href={reviewHref(review)}><Inline text={review.title} /></a>
							<p class="sub"><span class="mono">{review.owner}/{review.repo}#{review.pr}</span>{#if review.branch} · <span class="mono">{review.branch}</span>{/if}</p>
						</td>
						<td class="nowrap"><Badge plain meta={pullStateMeta(review)} /></td>
						<td class="mono nowrap">{review.headSha}</td>
						<td class="r nowrap muted">{relTime(review.updatedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</DataTable>
	</Panel>
{/if}
