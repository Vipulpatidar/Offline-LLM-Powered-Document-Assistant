from collections import defaultdict

import numpy as np

from core.config import settings
from models.faiss import load_index
from models.sqlite import get_chunk_by_vector
from services.embedder import embed_batch


def _round_robin_limit(items: list[dict], k: int) -> list[dict]:
    buckets = defaultdict(list)
    for item in items:
        buckets[item["document_id"]].append(item)

    result: list[dict] = []
    while len(result) < k:
        progressed = False
        for doc_id in sorted(buckets):
            if buckets[doc_id]:
                result.append(buckets[doc_id].pop(0))
                progressed = True
                if len(result) >= k:
                    break
        if not progressed:
            break
    return result


def retrieve(
    query: str,
    top_k: int | None = None,
    document_ids: list[int] | None = None,
):
    """Retrieve top-K chunks for a query, with optional document filtering and balancing."""

    k = top_k or settings.TOP_K
    filter_ids = set(document_ids or [])

    vec = embed_batch([query])[0]
    q = np.array([vec]).astype("float32")

    index = load_index()
    search_k = max(k * 5, k)
    scores, ids = index.search(q, search_k)

    results: list[dict] = []
    seen_chunk_keys: set[tuple[int, int]] = set()

    for score, vid in zip(scores[0], ids[0]):
        if vid == -1:
            continue

        if score < settings.SIMILARITY_THRESHOLD:
            continue

        chunk = get_chunk_by_vector(int(vid))
        if not chunk:
            continue

        if filter_ids and chunk["document_id"] not in filter_ids:
            continue

        key = (chunk["document_id"], chunk["chunk_index"])
        if key in seen_chunk_keys:
            continue
        seen_chunk_keys.add(key)

        results.append(
            {
                "score": float(score),
                "text": chunk["text"],
                "document_id": int(chunk["document_id"]),
                "chunk_index": int(chunk["chunk_index"]),
                "vector_id": int(vid),
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)

    if filter_ids and len(filter_ids) > 1:
        return _round_robin_limit(results, k)

    return results[:k]
