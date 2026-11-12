// Local prototype policy. Shared user quotas are implemented in a later stage.
export const aiPolicy = Object.freeze({
  proposalTtlSeconds: 600,
  providerTimeoutMs: 30_000,
  localRateWindowMs: 60_000,
  localRateRequests: 10,
  localRateKeys: 1_000,
});
