from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from services.pipeline_events import event_generator

router = APIRouter()


@router.get("/pipeline-events/{doc_id}")
async def stream_pipeline_events(doc_id: str):
    return EventSourceResponse(event_generator(doc_id))
