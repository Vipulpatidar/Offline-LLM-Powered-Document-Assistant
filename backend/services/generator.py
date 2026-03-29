import json
import logging
from typing import AsyncGenerator

import httpx

from core.config import settings
from services.retriever import retrieve

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def build_prompt(query: str, contexts: list[dict], document_mode: bool = False) -> str:
    logging.info("Building prompt...")

    if contexts:
        context_text = "\n\n".join(
            f"[{i + 1}] (doc:{c['document_id']} chunk:{c['chunk_index']}) {c['text']}"
            for i, c in enumerate(contexts)
        )
    else:
        context_text = "(No relevant context available)" if document_mode else ""

    if document_mode and contexts:
        instructions = (
            "Answer ONLY using the provided context. "
            "If the answer is not present, respond exactly with: "
            '"No relevant information found in the selected documents."\n'
            "Citation rules: every factual sentence must end with at least one inline citation "
            "like [1], [2]. Never cite a source that is not in the context list."
        )
    elif document_mode and not contexts:
        instructions = (
            "Answer ONLY using the provided context. "
            'If answer not found, return exactly: "No relevant information found in the selected documents."'
        )
    else:
        instructions = "Answer the question as best as you can using your knowledge."

    prompt = f"""
You are a helpful AI assistant.
{instructions}

Context:
{context_text}

Question:
{query}

Answer:
"""
    logging.info("Prompt built successfully.")
    return prompt.strip()


async def stream_llm(prompt: str, temperature: float) -> AsyncGenerator[str, None]:
    logging.info("Starting LLM stream call...")
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{settings.LLAMA_SERVER_URL}/v1/chat/completions",
            json={
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": settings.MAX_GENERATION_TOKENS,
                "stream": True,
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue

                data = line.replace("data: ", "")
                if data == "[DONE]":
                    break

                try:
                    token = json.loads(data)
                    delta = token["choices"][0]["delta"].get("content")
                    if delta:
                        yield delta
                except Exception as e:
                    logging.warning(f"Failed to parse line: {line} — {e}")
                    continue


async def generate_answer_stream(
    query: str,
    top_k: int | None = None,
    document_ids: list[int] | None = None,
) -> AsyncGenerator[str, None]:
    logging.info(f"Generating streaming answer for query: {query[:50]}...")

    if document_ids:
        contexts = retrieve(query, top_k=top_k, document_ids=document_ids)
        document_mode = True
        if not contexts:
            yield "No relevant information found in the selected documents."
            return
    else:
        contexts = []
        document_mode = False

    prompt = build_prompt(query, contexts, document_mode=document_mode)
    temperature = 0.2 if document_mode else settings.TEMPERATURE
    async for chunk in stream_llm(prompt, temperature=temperature):
        yield chunk


def generate_answer(
    query: str,
    top_k: int | None = None,
    document_ids: list[int] | None = None,
) -> dict:
    logging.info(f"Generating full answer for query: {query[:50]}...")

    if document_ids:
        contexts = retrieve(query, top_k=top_k, document_ids=document_ids)
        document_mode = True
        if not contexts:
            return {
                "answer": "No relevant information found in the selected documents.",
                "sources": [],
            }
    else:
        contexts = []
        document_mode = False

    prompt = build_prompt(query, contexts, document_mode=document_mode)
    temperature = 0.2 if document_mode else settings.TEMPERATURE
    response = httpx.post(
        f"{settings.LLAMA_SERVER_URL}/v1/chat/completions",
        json={
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": settings.MAX_GENERATION_TOKENS,
        },
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    answer = data["choices"][0]["message"]["content"].strip()

    sources = [
        {
            "document_id": c["document_id"],
            "chunk_index": c["chunk_index"],
            "score": c["score"],
            "vector_id": c["vector_id"],
        }
        for c in contexts
    ]

    return {"answer": answer, "sources": sources}
