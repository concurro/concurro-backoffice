import type { OperatorStatus } from '#lib/types.ts';
import { ago, H } from './time';

export const operator: OperatorStatus = {
	service: { version: '0f828d7', uptime: '6d 4h', healthy: true },
	queue: { depth: 3, running: 4, oldestQueuedS: 212, capacity: 6 },
	leases: [
		{ id: 'ls_81c2', task: 'example-org/tidepool#88', holder: 'worker-2', stage: 'implement', expiresInS: 1620, stale: false },
		{ id: 'ls_81c9', task: 'example-org/ledger-core#440', holder: 'worker-1', stage: 'intake', expiresInS: 540, stale: false },
		{ id: 'ls_81d0', task: 'sample-labs/atlas-cli#147', holder: 'worker-1', stage: 'publish', expiresInS: 310, stale: false },
		{ id: 'ls_7ffa', task: 'example-org/tidepool#91', holder: 'worker-3', stage: 'plan_qc', expiresInS: -95, stale: true }
	],
	unknownWrites: [
		{
			id: 'uw_204',
			task: 'example-org/ledger-core#412',
			kind: 'review reply',
			detail: 'POST /pulls/418/comments/1893420/replies timed out after 30s. The reply may or may not exist on GitHub.',
			at: ago(38)
		},
		{
			id: 'uw_199',
			task: 'example-org/tidepool#73',
			kind: 'check run',
			detail: 'PATCH /check-runs/55120394 returned 502. Status on GitHub is unknown.',
			at: ago(2 * H)
		}
	],
	drift: [
		{ target: 'example-org/ledger-core', servedEngine: '0f828d7', workflowRef: '0f828d7', inSync: true, note: 'Fork workflow pins the served engine.' },
		{ target: 'example-org/tidepool', servedEngine: '0f828d7', workflowRef: '7e39bc4', inSync: false, note: 'Fork workflow is one release behind. New turns run the older engine until the fork is updated.' },
		{ target: 'sample-labs/atlas-cli', servedEngine: '0f828d7', workflowRef: '0f828d7', inSync: true, note: 'Fork workflow pins the served engine.' }
	],
	sessions: [
		{ id: 'xs_c41a', task: 'tidepool#88', role: 'implementer', route: 'openai_api', state: 'active', startedAt: ago(11), calls: 1 },
		{ id: 'xs_c419', task: 'ledger-core#440', role: 'triage', route: 'openai_api', state: 'active', startedAt: ago(3), calls: 1 },
		{ id: 'xs_c3f7', task: 'ledger-core#412', role: 'implementer', route: 'anthropic_api', state: 'settled', startedAt: ago(22), calls: 1 },
		{ id: 'xs_c3e0', task: 'tidepool#91', role: 'plan_reviewer', route: 'openai_api', state: 'settled', startedAt: ago(44), calls: 1 },
		{ id: 'xs_c3b2', task: 'tidepool#79', role: 'implementer', route: 'openai_api', state: 'expired', startedAt: ago(5 * H), calls: 0 }
	],
	gateway: [
		{ route: 'anthropic_api', healthy: true, latencyMs: 840, errorRate: 0.2, budget: { used: 3520, max: 10000 }, unit: 'k tokens today' },
		{ route: 'claude_subscription', healthy: true, latencyMs: 910, errorRate: 0.0, budget: { used: 0, max: 5000 }, unit: 'k tokens today' },
		{ route: 'openai_api', healthy: false, latencyMs: 2310, errorRate: 7.4, budget: { used: 9150, max: 10000 }, unit: 'k tokens today' },
		{ route: 'chatgpt_subscription', healthy: true, latencyMs: 1020, errorRate: 0.4, budget: { used: 1200, max: 5000 }, unit: 'k tokens today' }
	]
};
