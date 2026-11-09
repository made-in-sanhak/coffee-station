from dataclasses import dataclass, field
from app.repositories.base import MenuMatch


@dataclass
class ConversationState:
    """Caller-owned in-memory state. No shared global session or disk persistence."""
    turns: list[dict] = field(default_factory=list)
    last_offer_ids: tuple[str, ...] = ()


@dataclass
class AgentResult:
    status: str
    message: str
    recommendations: tuple[MenuMatch, ...] = ()
    trace: list[dict] = field(default_factory=list)
    llm_calls: int = 0
    elapsed_ms: float = 0
