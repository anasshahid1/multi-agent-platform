"""
Ollama LLM client — handles communication with the local Ollama server.

This is the connection layer only. The queue/scheduling logic will be
added in Phase 2 (orchestrator/scheduler.py).

Provides:
- generate(): Send a prompt to the LLM and get a response
- is_available(): Check if Ollama is reachable
- get_model_info(): Get info about the loaded model
"""

import httpx
from typing import Optional
from config import settings


class LLMClient:
    """Client for communicating with the Ollama API."""

    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.timeout = settings.llm_request_timeout

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        model: Optional[str] = None,
    ) -> dict:
        """
        Send a prompt to the Ollama LLM and return the response.

        Args:
            prompt: The user prompt to send
            system_prompt: Optional system instruction for the model
            temperature: Sampling temperature (0.0 - 1.0)
            max_tokens: Maximum tokens to generate
            model: Override model name (defaults to settings.ollama_model)

        Returns:
            dict with 'response' (text), 'tokens' (count), 'duration' (seconds)
        """
        payload = {
            "model": model or self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        # Extract full tokenization details from Ollama response
        output_tokens = data.get("eval_count", 0)
        input_tokens = data.get("prompt_eval_count", 0)
        eval_duration_ns = data.get("eval_duration", 0)
        prompt_eval_duration_ns = data.get("prompt_eval_duration", 0)
        total_duration_ns = data.get("total_duration", 0)

        eval_duration_s = eval_duration_ns / 1_000_000_000 if eval_duration_ns else 0
        tokens_per_second = round(
            output_tokens / eval_duration_s, 2
        ) if eval_duration_s > 0 else 0

        return {
            "response": data.get("response", ""),
            "tokens": output_tokens,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "tokens_per_second": tokens_per_second,
            "prompt_eval_seconds": round(
                prompt_eval_duration_ns / 1_000_000_000, 2
            ) if prompt_eval_duration_ns else 0,
            "generation_seconds": round(eval_duration_s, 2),
            "duration_seconds": round(
                total_duration_ns / 1_000_000_000, 2
            ),
        }

    async def is_available(self) -> bool:
        """Check if the Ollama server is reachable."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def get_model_info(self) -> Optional[dict]:
        """Get information about the currently configured model."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code != 200:
                    return None

                data = response.json()
                models = data.get("models", [])

                for model in models:
                    if model.get("name", "").startswith(self.model.split(":")[0]):
                        return {
                            "name": model.get("name"),
                            "size": model.get("size"),
                            "modified_at": model.get("modified_at"),
                        }

                return {"name": self.model, "status": "not_pulled"}

        except (httpx.ConnectError, httpx.TimeoutException):
            return None


# Singleton instance
llm_client = LLMClient()
