/** Device grouping, connection states and usage matching for the Sponsor devices view. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/relays.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source.replace(/^import .*;$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const output = new URL('../.svelte-kit/relays-test.mjs', import.meta.url);
await mkdir(new URL('../.svelte-kit/', import.meta.url), { recursive: true });
await writeFile(output, javascript);
const { relayDevices, connection, replacement, deviceUsage, readUsage } = await import(output.href);

const entry = (id, type, relay, version, rest = {}) => ({ id, type, provider: type.startsWith('claude') ? 'anthropic' : 'openai', name: 'Studio', custody: relay ? 'relay' : 'vault', relay, version, ...rest });
const listing = { providers: [
    { provider: 'anthropic', entries: [entry('a1', 'anthropic_api', null, 1), entry('c', 'claude_subscription', 'relay-s', 2), entry('l', 'claude_subscription', 'relay-l', 3, { name: 'Laptop' })] },
    { provider: 'openai', entries: [entry('g', 'chatgpt_subscription', 'relay-s', 2, { name: 'Studio B' })] }
] };

test('relay entries group by device with Claude first, and token entries stay out', () => {
    const devices = relayDevices(listing);
    assert.deepEqual(devices.map((device) => [device.relay, device.name, device.entries.map((item) => item.id)]),
        [['relay-s', 'Studio / Studio B', ['c', 'g']], ['relay-l', 'Laptop', ['l']]]);
});

test('an approval is not a connection: only live links are online, and an unreadable service is unknown', () => {
    const base = { setup: { server: null, download: null }, service: 'available', started: '2026-11-17T00:00:00Z', relays: [] };
    assert.deepEqual(connection('relay-s', null), { state: 'unknown', reason: 'loading' });
    assert.deepEqual(connection('relay-s', { ...base, service: 'unavailable' }), { state: 'unknown', reason: 'unavailable' });
    assert.deepEqual(connection('relay-s', { ...base, service: 'unconfigured' }), { state: 'unknown', reason: 'unconfigured' });
    assert.deepEqual(connection('relay-s', base), { state: 'unseen', since: '2026-11-17T00:00:00Z' });
    const lease = { entry: 'c', route: 'claude-subscription', version: 2, since: '2026-11-17T00:01:00Z', task: null };
    assert.deepEqual(connection('relay-s', { ...base, relays: [{ relay: 'relay-s', idle: 1, active: [lease], lastSeen: 'now' }] }), { state: 'online', free: 1, total: 2 });
    assert.deepEqual(connection('relay-s', { ...base, relays: [{ relay: 'relay-s', idle: 0, active: [lease], lastSeen: 'now' }] }), { state: 'online', free: 0, total: 1 });
    assert.deepEqual(connection('relay-s', { ...base, relays: [{ relay: 'relay-s', idle: 0, active: [], lastSeen: '2026-11-17T00:02:00Z' }] }), { state: 'offline', since: '2026-11-17T00:02:00Z' });
});

test('replacement maps each registered route to the device entry and reports missing or kept routes', () => {
    const [studio, laptop] = relayDevices(listing);
    const both = ['chatgpt-subscription', 'claude-subscription'];
    assert.deepEqual(replacement(studio, both).entries.map((item) => item.id).toSorted(), ['c', 'g']);
    assert.deepEqual(replacement(laptop, both).missing, ['chatgpt-subscription']);
    const partial = replacement(studio, ['claude-subscription']);
    assert.deepEqual([partial.entries.map((item) => item.id), partial.kept.map((item) => item.id)], [['c'], ['g']]);
});

test('usage keeps charged calls and provider reports apart and counts only this device, version and sponsor', () => {
    const [studio] = relayDevices(listing);
    const observation = (request, route, version, sponsor, rest) => ({ request, source: 'provider', category: null, usage: null, binding: { sponsorship_provider: 'openai', sponsor, credential_version: version, route }, ...rest });
    const issues = [{ owner: 'o', repo: 'r', issue: 1, sponsorships: {
        charged_calls: [
            { id: '1', kind: 'contributed', sponsor: '42', route: 'chatgpt-subscription', version: 2, calls: 3 },
            { id: '2', kind: 'contributed', sponsor: '42', route: 'chatgpt-subscription', version: 1, calls: 9 },
            { id: '3', kind: 'contributed', sponsor: '84', route: 'claude-subscription', version: 2, calls: 5 },
            { id: '4', kind: 'org', calls: 7 }
        ],
        observations: [
            observation('a', 'chatgpt-subscription', 2, '42', { usage: { input_tokens: 10, output_tokens: 4 } }),
            observation('b', 'chatgpt-subscription', 2, '42', { category: 'rate_limited' }),
            observation('c', 'chatgpt-subscription', 2, '42', { source: 'resolver', category: 'rate_limited', usage: { input_tokens: 99, output_tokens: 99 } }),
            observation('d', 'chatgpt-subscription', 1, '42', { usage: { input_tokens: 500, output_tokens: 500 } }),
            observation('e', undefined, 2, '42', { usage: { input_tokens: 700, output_tokens: 700 } })
        ]
    } }];
    const used = deviceUsage(studio, issues, '42');
    assert.deepEqual(used.charged.map((row) => row.calls), [3]);
    assert.deepEqual(used.reported, { requests: 1, input: 10, output: 4 });
    assert.deepEqual(used.failures, [{ category: 'rate_limited', count: 2 }]);
    assert.deepEqual([used.ledger, used.reports], ['complete', 'complete']);
    assert.deepEqual(deviceUsage(studio, issues, '84').charged.map((row) => row.calls), [5]);
});

test('missing or own-scope evidence is unavailable or partial, never a false zero', () => {
    const [studio] = relayDevices(listing);
    const charged = [{ id: '1', kind: 'contributed', sponsor: '42', route: 'claude-subscription', version: 2, calls: 3 }];
    const usage = { request: 'a', source: 'provider', completed: true, category: null, usage: { input_tokens: 5, output_tokens: 1 },
        binding: { sponsorship_provider: 'anthropic', sponsor: '42', credential_version: 2, route: 'claude-subscription' } };
    const issue = (n, sponsorships) => ({ owner: 'o', repo: 'r', issue: n, sponsorships });
    const full = issue(1, { charged_calls: charged, observations: [usage], observations_status: 'available', native_status: 'available' });
    const own = issue(2, { scope: 'own', history: [] });
    const unknown = issue(3, { charged_calls: [], observations: null, observations_status: 'unknown' });
    const noNative = issue(4, { charged_calls: [], observations: [], observations_status: 'available', native_status: 'unavailable' });
    const unusable = issue(5, { charged_calls: [], observations: [{ ...usage, request: 'b', usage: null }] });

    const ownOnly = deviceUsage(studio, [own], '42');
    assert.deepEqual([ownOnly.ledger, ownOnly.reports], ['unavailable', 'unavailable']);
    const mixed = deviceUsage(studio, [full, own], '42');
    assert.deepEqual([mixed.ledger, mixed.reports, mixed.charged.map((row) => row.calls)], ['partial', 'partial', [3]]);
    const lost = deviceUsage(studio, [full, unknown], '42');
    assert.deepEqual([lost.ledger, lost.reports], ['complete', 'partial']);
    assert.deepEqual(deviceUsage(studio, [unknown], '42').reports, 'unavailable');
    assert.deepEqual(deviceUsage(studio, [noNative], '42').reports, 'partial');
    assert.deepEqual(deviceUsage(studio, [unusable], '42').reports, 'partial');
    // Absent or non-list observations are missing evidence, not zero reports.
    for (const observations of [undefined, {}, 'none']) {
        const absent = issue(6, { charged_calls: [], ...(observations === undefined ? {} : { observations }) });
        assert.deepEqual(deviceUsage(studio, [absent], '42').reports, 'unavailable');
        assert.deepEqual(deviceUsage(studio, [full, absent], '42').reports, 'partial');
    }
    // Native evidence that is explicitly unknown keeps measured values but marks them partial.
    const nativeUnknown = deviceUsage(studio, [issue(7, { charged_calls: [], observations: [usage], native_status: 'unknown' })], '42');
    assert.deepEqual([nativeUnknown.reports, nativeUnknown.reported], ['partial', { requests: 1, input: 5, output: 1 }]);
    assert.deepEqual(deviceUsage(studio, [issue(8, { charged_calls: [], observations: [] })], '42').reports, 'complete');
    assert.deepEqual(deviceUsage(studio, [], '42').ledger, 'complete');
});

test('a failed usage read can be refreshed, and a later failure keeps the earlier result', async () => {
    const issues = [{ owner: 'o', repo: 'r', issue: 1 }];
    let fail = true;
    const read = async () => { if (fail) throw new Error('synthetic outage'); return issues; };
    const failed = await readUsage(read, { issues: null, failed: false });
    assert.deepEqual(failed, { issues: null, failed: true });
    fail = false;
    const recovered = await readUsage(read, failed);
    assert.deepEqual(recovered, { issues, failed: false });
    fail = true;
    assert.deepEqual(await readUsage(read, recovered), { issues, failed: true });
});
