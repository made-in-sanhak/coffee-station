import { confirm, parseBudget, prepare, SAMPLE } from '../src/api/recommendations';
import { apiFetch } from '../src/api/client';
jest.mock('../src/api/client', () => ({ apiFetch: jest.fn() }));

test('local preparation, edited budget and empty results use no API', async () => {
  const signal = new AbortController().signal;
  const proposal = await prepare(SAMPLE, 'local', signal);
  for (const [budget, count] of [[4000, 3], [3500, 2], [2999, 0]]) {
    const result = await confirm(proposal, { max_price_krw: budget, category: 'COFFEE', sort_by: 'price', limit: 20 }, 'local', signal);
    expect(result.recommendations).toHaveLength(count);
    expect(result.status).toBe(count ? 'RESULT' : 'QUESTION');
  }
  expect(apiFetch).not.toHaveBeenCalled();
});
test('unsupported wording cannot be confirmed', async () => {
  const signal = new AbortController().signal;
  const proposal = await prepare('알레르기 조건', 'local', signal);
  await expect(confirm(proposal, proposal.suggested_constraints, 'local', signal)).rejects.toThrow('미해결');
});
test('budget validates user edits', () => {
  expect(parseBudget('')).toBeNull();
  expect(parseBudget('0')).toBe(0);
  for (const text of ['-1', '3.5', 'abc']) { expect(() => parseBudget(text)).toThrow(); }
});
