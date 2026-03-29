from fastapi import APIRouter
from pydantic import BaseModel

from services.retriever import retrieve

router = APIRouter()


class Query(BaseModel):
    query: str
    top_k: int | None = None
    document_ids: list[int] | None = None


@router.post("/search")
def search(q: Query):
    return {"results": retrieve(q.query, top_k=q.top_k, document_ids=q.document_ids)}
