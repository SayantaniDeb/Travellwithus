import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlanningJson } from '../src/utils/parsePlanningJson.js';

test('valid fenced JSON does not trigger an AI repair', async () => {
  assert.deepEqual(await parsePlanningJson('```json\n{"days":[]}\n```', () => { throw new Error('unneeded'); }), {days:[]});
});
test('unquoted title gets one syntax repair before validation', async () => {
  let calls=0;
  const invalid='{"title": North Goa, "days":[]}';
  const plan=await parsePlanningJson(invalid, async text => { calls++; assert.equal(text,invalid); return '{"title":"North Goa","days":[]}'; });
  assert.equal(plan.title,'North Goa'); assert.equal(calls,1);
});
test('invalid repair fails without accepting a partial plan or repeated retries', async () => {
  let calls=0;
  await assert.rejects(parsePlanningJson('{"days":[', async () => { calls++; return '{"days":['; }), /could not format/);
  assert.equal(calls,1);
});
