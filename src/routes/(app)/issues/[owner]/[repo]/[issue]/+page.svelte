<script lang="ts">
    import PageHeader from '#lib/components/PageHeader.svelte';
    import ProviderSponsorship from '#lib/components/ProviderSponsorship.svelte';
    import ErrorState from '#lib/components/ErrorState.svelte';
    import Skeleton from '#lib/components/Skeleton.svelte';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>
<svelte:head><title>Issue sponsorship · Concurro</title></svelte:head>
{#await data.result}<Skeleton rows={6} />{:then { issue, issueWriter }}
    <PageHeader title={issue.title} subtitle={`${issue.owner}/${issue.repo}#${issue.issue} · Issue consent is recorded independently of task enrollment.`} />
    <ProviderSponsorship {issue} projection={issue.sponsorships} writer={issueWriter} />
{:catch error}<ErrorState {error} />{/await}
