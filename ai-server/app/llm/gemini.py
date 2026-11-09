"""Manual Google Gen AI function calling, with complete model Content preserved."""
from app.llm.base import Reply, ToolCall


class GeminiModel:
    def __init__(self, *, api_key: str, model: str):
        from google import genai
        from google.genai import types
        if not api_key or not model:
            raise ValueError("API key and model name are required")
        self.model = model
        self.client = genai.Client(api_key=api_key, vertexai=False, http_options=types.HttpOptions(
            timeout=10_000,
            retry_options=types.HttpRetryOptions(attempts=1)))

    def close(self):
        self.client.close()

    def generate(self, system, messages, tools, timeout_s, *, response_schema=None):
        from google.genai import types
        contents = []
        for message in messages:
            if message["role"] == "user":
                contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message["text"])]))
            elif message["role"] == "model":
                # Preserve thought signatures and all other provider protocol metadata.
                contents.append(message["reply"].native)
            else:
                parts = []
                for result in message["results"]:
                    call = result["call"]
                    parts.append(types.Part(function_response=types.FunctionResponse(
                        name=call.name, id=call.id, response=result["response"])))
                # GenerateContent represents function results as user Content.
                # The agent's internal "tool" role is provider-independent.
                contents.append(types.Content(role="user", parts=parts))
        response = self.client.models.generate_content(
            model=self.model, contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system, temperature=0,
                response_mime_type='application/json' if response_schema is not None else None,
                response_json_schema=response_schema,
                tools=[types.Tool(function_declarations=[types.FunctionDeclaration(**t) for t in tools])] if tools else None,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                http_options=types.HttpOptions(timeout=max(1, int(timeout_s * 1000)),
                    retry_options=types.HttpRetryOptions(attempts=1)),
            ),
        )
        if not response.candidates or not response.candidates[0].content:
            raise ValueError("Model returned no candidate content")
        content = response.candidates[0].content
        parts = content.parts or []
        calls = tuple(ToolCall(p.function_call.name, dict(p.function_call.args or {}), p.function_call.id)
                      for p in parts if p.function_call)
        text = "".join(p.text for p in parts if p.text and not p.thought)
        return Reply(text=text, calls=calls, native=content)
