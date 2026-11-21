<script lang="ts">
    import PageHeader from '#lib/components/PageHeader.svelte';
    import FundingAudit from '#lib/components/FundingAudit.svelte';
    import ProviderSponsorship from '#lib/components/ProviderSponsorship.svelte';
    import ErrorState from '#lib/components/ErrorState.svelte';
    import Skeleton from '#lib/components/Skeleton.svelte';
    import Panel from '#lib/components/Panel.svelte';
    import Collapsible from '#lib/components/Collapsible.svelte';
    import CodeBlock from '#lib/components/CodeBlock.svelte';
    import { api } from '#lib/api/index.ts';
    import type { ReadTranscriptLine } from '#lib/api/read-model.ts';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    let selected = $state('');
    let transcript = $state<Promise<ReadTranscriptLine[]> | null>(null);
	/** Open an imported turn's writer-scoped archive in the existing issue view. */
	function openTurn(deployment: string, sourceId: string) {
		selected = `${deployment}:${sourceId}`;
		transcript = api.turnTranscript('', `import:${selected}`);
	}
</script>
<svelte:head><title>Issue sponsorship · Concurro</title></svelte:head>
{#await data.result}<Skeleton rows={6} />{:then { issue, target, issueWriter }}
    <PageHeader title={issue.title} subtitle={`${issue.owner}/${issue.repo}#${issue.issue} · Issue consent is recorded independently of task enrollment.`} />
    <div class="stack">
        <ProviderSponsorship {issue} {target} projection={issue.sponsorships} writer={issueWriter} />
        {#if issue.sponsorships && issue.sponsorships.scope !== 'own'}<FundingAudit projection={issue.sponsorships} />{/if}
        {#if 'historicalTurns' in issue && issue.historicalTurns?.length}
            <Panel title="Imported turn history" meta={String(issue.historicalTurns.length)}>
                {#each issue.historicalTurns as turn}
                    <button type="button" onclick={() => openTurn(turn.deployment, turn.sourceId)}>
                        {turn.stage} · {turn.status} · {turn.deployment}/{turn.sourceId}
                    </button>
                {/each}
                {#if transcript}
                    {#await transcript}<Skeleton rows={4} />{:then lines}
                        {#each lines as line (line.position)}
                            <Collapsible title={line.kind || 'Archive event'} meta={`${line.member_path}:${line.line_number}`}>
                                <CodeBlock flush json={line.json !== null}
                                    text={line.json === null ? line.fallback_base64 || line.diagnostic || '' : JSON.stringify(line.json, null, 2)} />
                            </Collapsible>
                        {:else}<p>No archived transcript is available for {selected}.</p>{/each}
                    {:catch error}<p>{error instanceof Error ? error.message : 'Transcript unavailable.'}</p>{/await}
                {/if}
            </Panel>
        {/if}
    </div>
{:catch error}<ErrorState {error} />{/await}
<style>
    .stack { display: grid; gap: var(--s-4); max-width: 720px; }
    button { display: block; margin: var(--s-2) 0; padding: var(--s-2); border: 0; background: none; color: var(--accent-text); cursor: pointer; }
</style>
