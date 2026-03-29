from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
import asyncio

router = APIRouter()

pipeline_events = []

async def event_generator():
    while True:
        if pipeline_events:
            event = pipeline_events.pop(0)
            yield {
                "event": "pipeline",
                "data": event
            }
        await asyncio.sleep(0.2)

@router.get("/pipeline-events")
async def pipeline_stream():
    return EventSourceResponse(event_generator())
