import asyncio
from collections import defaultdict
from typing import AsyncGenerator


event_queues: defaultdict[str, asyncio.Queue] = defaultdict(asyncio.Queue)


async def push_event(doc_id: str, stage: str, progress: int, total: int = 5) -> None:
    event = {
        "doc_id": doc_id,
        "stage": stage,
        "progress": progress,
        "total": total,
    }
    await event_queues[doc_id].put(event)


async def event_generator(doc_id: str) -> AsyncGenerator[dict, None]:
    queue = event_queues[doc_id]

    while True:
        event = await queue.get()

        yield {
            "event": "pipeline",
            "data": event,
        }

        if event["stage"] == "ready":
            break
