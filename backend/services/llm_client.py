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
    ) -> dict:
        """
        Send a prompt to the Ollama LLM and return the response.

        Args:
            prompt: The user prompt to send
            system_prompt: Optional system instruction for the model
            temperature: Sampling temperature (0.0 - 1.0)
            max_tokens: Maximum tokens to generate

        Returns:
            dict with 'response' (text), 'tokens' (count), 'duration' (seconds)
        """
        payload = {
            "model": self.model,
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

        return {
            "response": data.get("response", ""),
            "tokens": data.get("eval_count", 0),
            "duration_seconds": round(
                data.get("total_duration", 0) / 1_000_000_000, 2
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
