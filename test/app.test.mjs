import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApp } from '../server.mjs';
import { explain, parseExplanation, validateInput } from '../lib/explain.mjs';
import { samples } from '../public/samples.js';

const input = { code: 'const x = 1;', language: 'JavaScript', level: 'Beginner' };
const lesson = samples.javascript.explanation;
const reply = () => new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(lesson) }], stop_reason: 'end_turn' }), { status: 200 });

async function start(t, options = {}) {
  const server = createApp(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
const post = (url, body, headers = {}) => fetch(`${url}/api/explain`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body)
});

test('validation rejects empty, excessive, and unsupported inputs', () => {
  for (const bad of [null, [], { ...input, code: ' ' }, { ...input, code: 'a'.repeat(12001) }, { ...input, code: 7 }, { ...input, language: 'Invented' }, { ...input, level: 'Expert' }]) {
    assert.throws(() => validateInput(bad), { status: 400 });
  }
  assert.deepEqual(validateInput(input), input);
});

test('both bundled lessons have a complete, renderable explanation', () => {
  for (const sample of Object.values(samples)) assert.deepEqual(parseExplanation(JSON.stringify(sample.explanation)), sample.explanation);
});

test('invalid and incomplete model responses produce a readable error', () => {
  for (const bad of ['not json', '{}', 'null', JSON.stringify({ ...lesson, steps: [null] }), JSON.stringify({ ...lesson, concepts: 'bad' })]) {
    assert.throws(() => parseExplanation(bad), { status: 502 });
  }
  assert.deepEqual(parseExplanation('```json\n' + JSON.stringify(lesson) + '\n```'), lesson);
});

test('Claude request uses server credentials and treats snippets as data', async () => {
  let captured;
  const result = await explain(input, { apiKey: 'test-key-not-real', model: 'test-model', workspaceId: 'test-workspace', fetchImpl: async (url, options) => { captured = { url, ...options }; return reply(); } });
  assert.deepEqual(result, lesson);
  assert.equal(captured.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(captured.headers['x-api-key'], 'test-key-not-real');
  assert.equal(captured.headers['anthropic-workspace-id'], 'test-workspace');
  const payload = JSON.parse(captured.body);
  assert.equal(payload.model, 'test-model');
  assert.equal(payload.max_tokens, 4000);
  assert.equal(JSON.parse(payload.messages[0].content).sourceCode, input.code);
  assert.equal('tools' in payload, false);
});

test('API errors do not expose upstream responses or keys', async () => {
  for (const status of [400, 401, 403, 404, 429, 500, 529]) {
    await assert.rejects(explain(input, { apiKey: 'private-token', model: 'test', fetchImpl: async () => new Response('private-token upstream debug', { status }) }), error => {
      assert.equal(error.message.includes('private-token'), false);
      assert.equal(error.status, status === 429 ? 429 : 502); return true;
    });
  }
});

test('network failure, timeout and truncated output are handled', async () => {
  await assert.rejects(explain(input, { apiKey: '', model: 'test' }), { status: 503 });
  await assert.rejects(explain(input, { apiKey: 'test', model: 'test', fetchImpl: async () => { throw new TypeError('fetch failed'); } }), { status: 502 });
  await assert.rejects(explain(input, { apiKey: 'test', model: 'test', fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); } }), { status: 504 });
  await assert.rejects(explain(input, { apiKey: 'test', model: 'test', fetchImpl: async () => new Response(JSON.stringify({ stop_reason: 'max_tokens' })) }), { status: 502 });
});

test('sample server serves assets but never project files or configuration', async t => {
  const { url } = await start(t);
  for (const path of ['/', '/styles.css', '/app.js', '/samples.js', '/favicon.svg']) {
    const response = await fetch(url + path); assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  }
  for (const path of ['/.env', '/.env.example', '/server.mjs', '/package.json', '/lib/explain.mjs', '/%2e%2e/.env']) {
    assert.equal((await fetch(url + path)).status, 404);
  }
  assert.deepEqual(await (await fetch(url + '/api/status')).json(), { connected: false, model: null });
  assert.equal((await post(url, input)).status, 503);
});

test('configured end-to-end flow returns a lesson without returning the key', async t => {
  const { url } = await start(t, { apiKey: 'private-token', fetchImpl: async () => reply() });
  const status = await (await fetch(url + '/api/status')).text();
  assert.equal(status.includes('private-token'), false);
  const response = await post(url, input);
  assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.source, 'claude'); assert.deepEqual(data.explanation, lesson);
});

test('cross-site requests and invalid hosts cannot use the API', async t => {
  let called = false;
  const { url, server } = await start(t, { apiKey: 'test', fetchImpl: async () => { called = true; return reply(); } });
  assert.equal((await post(url, input, { Origin: 'https://example.com' })).status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port: server.address().port, path: '/api/status', headers: { host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
  });
  assert.equal(hostStatus, 403); assert.equal(called, false);
});

test('malformed JSON, excessive bodies and unsupported content types are rejected', async t => {
  const { url } = await start(t, { apiKey: 'test' });
  assert.equal((await fetch(url + '/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(url + '/api/explain', { method: 'POST', body: JSON.stringify(input) })).status, 415);
  assert.equal((await post(url, { ...input, code: 'x'.repeat(70000) })).status, 413);
});

test('rate limit prevents additional upstream requests', async t => {
  let calls = 0;
  const { url } = await start(t, { apiKey: 'test', maxRequests: 1, fetchImpl: async () => { calls++; return reply(); } });
  assert.equal((await post(url, input)).status, 200);
  assert.equal((await post(url, input)).status, 429);
  assert.equal(calls, 1);
});

test('only one paid explanation can run at once', async t => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  const { url } = await start(t, { apiKey: 'test', fetchImpl: async () => { entered(); await wait; return reply(); } });
  const first = post(url, input);
  await started;
  const second = await post(url, input);
  release();
  assert.equal(second.status, 429);
  assert.equal((await first).status, 200);
});
