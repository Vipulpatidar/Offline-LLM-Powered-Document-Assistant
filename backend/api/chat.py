import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.generator import generate_answer, generate_answer_stream
from services.retriever import retrieve

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    top_k: int | None = None
    document_ids: list[int] | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    return generate_answer(
        query=req.query,
        top_k=req.top_k,
        document_ids=req.document_ids,
    )


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    document_mode = bool(req.document_ids)

    if document_mode:
        contexts = retrieve(req.query, top_k=req.top_k, document_ids=req.document_ids)
        if not contexts:
            async def empty_generator():
                yield (
                    json.dumps(
                        {
                            "_type": "message",
                            "data": "No relevant information found in the selected documents.",
                        }
                    )
                    + "\n"
                ).encode("utf-8")
                yield (json.dumps({"_type": "done"}) + "\n").encode("utf-8")

            return StreamingResponse(empty_generator(), media_type="application/x-ndjson")

        source_map = {
            str(i + 1): {
                "document_id": c["document_id"],
                "chunk_index": c["chunk_index"],
                "score": c["score"],
                "text": c["text"],
                "vector_id": c["vector_id"],
            }
            for i, c in enumerate(contexts)
        }

        generator = generate_answer_stream(
            query=req.query,
            top_k=req.top_k,
            document_ids=req.document_ids,
        )

        async def event_generator():
            yield (json.dumps({"_type": "source_map", "data": source_map}) + "\n").encode("utf-8")
            async for chunk in generator:
                yield (json.dumps({"_type": "token", "data": chunk}) + "\n").encode("utf-8")
            yield (json.dumps({"_type": "done"}) + "\n").encode("utf-8")

        return StreamingResponse(event_generator(), media_type="application/x-ndjson")

    generator = generate_answer_stream(
        query=req.query,
        top_k=req.top_k,
        document_ids=None,
    )

    async def event_generator():
        async for chunk in generator:
            yield (json.dumps({"_type": "token", "data": chunk}) + "\n").encode("utf-8")
        yield (json.dumps({"_type": "done"}) + "\n").encode("utf-8")

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")
