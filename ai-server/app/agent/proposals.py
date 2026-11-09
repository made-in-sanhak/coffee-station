"""Bounded, single-process proposal storage for the local prototype."""
from secrets import token_urlsafe
from threading import Lock
from time import monotonic


class ProposalStore:
    def __init__(self, ttl=600, capacity=100):
        self.ttl, self.capacity = ttl, capacity
        self.items = {}
        self.lock = Lock()

    def add(self, proposal):
        with self.lock:
            now = monotonic()
            self.items = {k: v for k, v in self.items.items() if v[0] > now}
            if len(self.items) >= self.capacity:
                raise ValueError('Proposal capacity reached')
            key = token_urlsafe(32)
            self.items[key] = (now + self.ttl, proposal)
            return key

    def consume(self, key):
        with self.lock:
            item = self.items.get(key)
            if item is None or item[0] <= monotonic():
                self.items.pop(key, None)
                raise KeyError('Proposal expired or already used')
            if item[1].unresolved:
                raise ValueError('Resolve conditions by preparing a revised message first')
            del self.items[key]
            return item[1]
