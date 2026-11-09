from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: dict
    id: str | None = None


@dataclass(frozen=True)
class Reply:
    text: str = ""
    calls: tuple[ToolCall, ...] = ()
    native: Any = None


class Model(Protocol):
    def generate(self, system: str, messages: list, tools: list, timeout_s: float, *, response_schema=None) -> Reply: ...


@dataclass
class ScriptedModel:
    """Deterministic model for offline tests; never performs network requests."""
    replies: list[Reply]
    requests: list = field(default_factory=list)

    def generate(self, system, messages, tools, timeout_s, *, response_schema=None):
        self.requests.append(list(messages))
        if not self.replies:
            raise RuntimeError("No scripted reply remains")
        return self.replies.pop(0)
