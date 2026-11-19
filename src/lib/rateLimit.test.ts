import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from './rateLimit';

test('rate limiter allows `limit` hits per window per key, then resets', () => {
  const check = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(check('a', 0).allowed, true);
  assert.equal(check('a', 10).allowed, true);
  const blocked = check('a', 20);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, 1);
  assert.equal(check('b', 20).allowed, true, 'keys are independent');
  assert.equal(check('a', 1000).allowed, true, 'window resets');
});
