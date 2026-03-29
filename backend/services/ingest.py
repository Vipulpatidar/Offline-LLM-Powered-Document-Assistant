import asyncio

from models.faiss import add_vectors
from models.sqlite import (
    get_document,
    insert_chunks,
    map_vector,
    update_document_status,
)
from services.chunker import chunk_text
from services.embedder import embed_batch
from services.ocr import extract_text_smart
from services.pipeline_events import push_event


def _emit_event_sync(doc_id: str, stage: str, progress: int, total: int = 5) -> None:
    asyncio.run(push_event(str(doc_id), stage, progress, total))


def process_document(doc_id: int):
    document = get_document(doc_id)
    if document is None:
        return

    update_document_status(doc_id, "processing")

    _emit_event_sync(doc_id, "parsing", 1)
    text = extract_text_smart(document["filepath"])

    _emit_event_sync(doc_id, "ocr", 2)
    chunks = chunk_text(text)

    _emit_event_sync(doc_id, "embedding", 3)
    vectors = embed_batch([chunk_text for _, chunk_text, _ in chunks])

    _emit_event_sync(doc_id, "indexing", 4)
    chunk_ids = insert_chunks(doc_id, chunks)
    vector_ids = add_vectors(vectors)

    for vector_id, chunk_id in zip(vector_ids, chunk_ids):
        map_vector(vector_id, chunk_id)

    update_document_status(doc_id, "ready")
    _emit_event_sync(doc_id, "ready", 5)
