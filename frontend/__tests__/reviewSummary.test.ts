import { getReviewSummary } from '../src/api/reviewSummary';
import { apiFetch } from '../src/api/client';

jest.mock('../src/api/client', () => ({ apiFetch: jest.fn() }));

test('local review preview never calls the API', async () => {
  const result = await getReviewSummary(990001, 'local');
  expect(result.summary.opinions).toHaveLength(3);
  expect(result.llm_calls).toBe(0);
  expect(apiFetch).not.toHaveBeenCalled();
});

test('server preview rejects non-mock data', async () => {
  jest.mocked(apiFetch).mockResolvedValueOnce({ data_mode: 'real', summary: { opinions: [] } });
  await expect(getReviewSummary(990001, 'server')).rejects.toThrow('모의 리뷰');
});
