import json
from time import monotonic

from app.agent.context import SYSTEM, build_context
from app.agent.state import AgentResult, ConversationState
from app.agent.tools import DECLARATIONS, execute_tool
from app.llm.diagnostics import diagnose_model_error
from app.repositories.base import RepositoryError, SearchFilters


def run_turn(model, repo, message: str, *, constraints: SearchFilters,
             state: ConversationState | None = None, within_previous=False,
             max_llm_calls=6, max_tool_calls=10, timeout_s=60) -> AgentResult:
    """Confirmed filters must be supplied by the caller, not inferred as trusted facts.

    Provider timeouts bound each request; wall time is checked between operations.
    Repository calls are synchronous in this prototype (no forced cancellation).
    """
    if not isinstance(message, str) or not message.strip() or len(message) > 4000:
        raise ValueError("message must contain 1..4000 characters")
    if not isinstance(constraints, SearchFilters):
        raise ValueError("confirmed SearchFilters required")
    if type(max_llm_calls) is not int or not 1 <= max_llm_calls <= 20:
        raise ValueError("invalid LLM budget")
    if type(max_tool_calls) is not int or not 1 <= max_tool_calls <= 50:
        raise ValueError("invalid tool budget")
    if not isinstance(timeout_s, (int, float)) or not 0 < timeout_s <= 300:
        raise ValueError("invalid timeout")
    state = state if state is not None else ConversationState()
    scope = state.last_offer_ids if within_previous else None
    messages = [{"role": "user", "text": build_context(message, constraints, state.turns, scope)}]
    trace, seen, retrieved = [], set(), {}
    start, calls, tool_count = monotonic(), 0, 0

    def finish(status, text, recommendations=()):
        result = AgentResult(status, text, recommendations, trace, calls,
                             round((monotonic() - start) * 1000, 2))
        if status in ("RESULT", "QUESTION"):
            state.turns.append({"user": message, "status": status, "answer": text,
                                "offer_ids": [m.offer.id for m in recommendations]})
            state.turns[:] = state.turns[-4:]
            if status == "RESULT":
                state.last_offer_ids = tuple(m.offer.id for m in recommendations)
        return result

    while calls < max_llm_calls:
        remaining = timeout_s - (monotonic() - start)
        if remaining <= 0:
            return finish("LIMIT", "실행 시간 제한에 도달했습니다.")
        calls += 1  # Counts failed attempts, too. SDK retries are disabled.
        before = monotonic()
        try:
            reply = model.generate(SYSTEM, messages, DECLARATIONS, remaining)
        except Exception as error:
            diagnostic, hint = diagnose_model_error(error)
            trace.append({"event": "model_error", "call": calls, **diagnostic})
            return finish("ERROR", hint)
        trace.append({"event": "model", "call": calls,
                      "elapsed_ms": round((monotonic() - before) * 1000, 2)})
        if monotonic() - start >= timeout_s:
            return finish("LIMIT", "실행 시간 제한에 도달했습니다.")
        messages.append({"role": "model", "reply": reply})
        if reply.calls:
            results = []
            for call in reply.calls:
                if monotonic() - start >= timeout_s:
                    return finish("LIMIT", "실행 시간 제한에 도달했습니다.")
                if tool_count >= max_tool_calls:
                    return finish("LIMIT", "도구 호출 제한에 도달했습니다.")
                tool_count += 1
                before = monotonic()
                try:
                    signature = json.dumps([call.name, call.arguments], sort_keys=True, allow_nan=False)
                    if signature in seen:
                        raise ValueError("Identical tool call already attempted")
                    seen.add(signature)
                    payload, matches = execute_tool(repo, call, constraints, scope)
                    retrieved.update({m.offer.id: m for m in matches})
                except (ValueError, TypeError) as exc:
                    payload = {"status": "error", "code": "INVALID_TOOL_CALL",
                               "message": str(exc)}
                except RepositoryError:
                    trace.append({"event": "tool", "tool": call.name, "status": "error",
                                  "code": "REPOSITORY_ERROR"})
                    return finish("ERROR", "데이터 조회에 실패했습니다. 빈 검색 결과가 아닙니다.")
                # Do not log raw arguments, locations, prompts, keys or provider errors.
                trace.append({"event": "tool", "tool": call.name,
                    "status": payload["status"], "code": payload.get("code"),
                    "result_count": len(payload.get("items", [])),
                    "elapsed_ms": round((monotonic() - before) * 1000, 2)})
                results.append({"call": call, "response": payload})
            messages.append({"role": "tool", "results": results})
            continue
        try:
            final = json.loads(reply.text)
            if not isinstance(final, dict):
                raise ValueError("Expected a JSON object")
            if final.get("type") == "QUESTION":
                question = final.get("question")
                if not isinstance(question, str) or not question.strip() or len(question) > 500:
                    raise ValueError("Invalid question")
                return finish("QUESTION", question)
            ids = final.get("offer_ids")
            if final.get("type") != "RESULT" or not isinstance(ids, list) or any(
                not isinstance(i, str) or i not in retrieved for i in ids
            ) or len(ids) != len(set(ids)):
                raise ValueError("Use unique offer IDs from successful menu searches")
            if not any(t.get("tool") == "search_menus" and t.get("status") == "ok" for t in trace):
                raise ValueError("Search menus before returning results")
            # Retrieved offers already satisfy confirmed filters. All displayed
            # facts come from this turn's repository snapshots, never model text.
            selected = [retrieved[i] for i in ids if retrieved[i].offer.price_krw is not None]
            key = (lambda m: (m.distance_m if m.distance_m is not None else float("inf"), m.offer.id)) if constraints.sort_by == "distance" else (lambda m: (m.offer.price_krw, m.offer.id))
            selected.sort(key=key)
            selected = tuple(selected[:constraints.limit])
            message = "확인 가능한 추천 결과가 없습니다."
            if selected:
                message = "임시 데이터 기반 추천입니다." if any(
                    m.offer.evidence.is_mock or m.cafe.evidence.is_mock for m in selected
                ) else "조회 데이터 기반 추천입니다."
            return finish("RESULT", message, selected)
        except (ValueError, TypeError):
            trace.append({"event": "invalid_final"})
            messages.append({"role": "user", "text": "Invalid final output. Return the required JSON and only retrieved offer IDs, or ask a question."})
    return finish("LIMIT", "모델 호출 제한에 도달했습니다.")
