<script lang="ts">
    import PageHeader from '#lib/components/PageHeader.svelte';
    import FundingAudit from '#lib/components/FundingAudit.svelte';
    import ProviderSponsorship from '#lib/components/ProviderSponsorship.svelte';
    import ErrorState from '#lib/components/ErrorState.svelte';
    import Skeleton from '#lib/components/Skeleton.svelte';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>
<svelte:head><title>Issue sponsorship · Concurro</title></svelte:head>
{#await data.result}<Skeleton rows={6} />{:then { issue, target, issueWriter }}
    <PageHeader title={issue.title} subtitle={`${issue.owner}/${issue.repo}#${issue.issue} · Issue consent is recorded independently of task enrollment.`} />
    <div class="stack">
        <ProviderSponsorship {issue} {target} projection={issue.sponsorships} writer={issueWriter} />
        {#if issue.sponsorships && issue.sponsorships.scope !== 'own'}<FundingAudit projection={issue.sponsorships} />{/if}
    </div>
{:catch error}<ErrorState {error} />{/await}
<style>
    .stack { display: grid; gap: var(--s-4); max-width: 480px; }
</style>
