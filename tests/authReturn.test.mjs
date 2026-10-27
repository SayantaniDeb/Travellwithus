import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberPlannerReturn, consumePlannerReturn } from '../src/utils/authReturn.js';

function storage() {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}

test('returns to the exact planner destination once after sign-in', () => {
  const session = storage();
  const path = '/plan-trip?destination=Heyi%2C+China';
  rememberPlannerReturn(session, path);
  assert.equal(consumePlannerReturn(session), path);
  assert.equal(consumePlannerReturn(session), '/home');
});

test('failed sign-in leaves the return target available for a later retry', () => {
  const session = storage();
  rememberPlannerReturn(session, '/plan-trip?destination=Goa%2C+India');
  assert.ok(session.getItem('travelwithus-auth-return'));
  assert.equal(consumePlannerReturn(session), '/plan-trip?destination=Goa%2C+India');
});

test('rejects external redirects and expires abandoned return targets', () => {
  const session = storage();
  assert.throws(() => rememberPlannerReturn(session, '//example.com'));
  session.setItem('travelwithus-auth-return', JSON.stringify({path:'https://example.com',createdAt:Date.now()}));
  assert.equal(consumePlannerReturn(session), '/home');
  rememberPlannerReturn(session, '/plan-trip?destination=Goa');
  assert.equal(consumePlannerReturn(session, Date.now() + 25 * 60 * 60 * 1000), '/home');
  session.setItem('travelwithus-auth-return', 'invalid json');
  assert.equal(consumePlannerReturn(session), '/home');
});
