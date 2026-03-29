from sentence_transformers import SentenceTransformer
from core.config import settings
import numpy as np
import threading

_model = None
_lock = threading.Lock()


# ------------------------------------------------
# LOAD MODEL (lazy init)
# ------------------------------------------------
def _get_model():
    global _model

    if _model is None:
        with _lock:
            if _model is None:
                print("[EMBEDDER] Loading model...")
                _model = SentenceTransformer(str(settings.EMBEDDING_MODEL_PATH))
                print("[EMBEDDER] Model loaded")

    return _model


# ------------------------------------------------
# BATCH EMBEDDING
# ------------------------------------------------
def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    model = _get_model()

    embeddings = model.encode(
        texts,
        batch_size=settings.FAISS_BATCH_SIZE,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    return embeddings.astype("float32").tolist()


# ------------------------------------------------
# SINGLE QUERY EMBEDDING
# ------------------------------------------------
def embed_query(text: str) -> list[float]:

    model = _get_model()

    vec = model.encode(
        [text],
        convert_to_numpy=True,
        normalize_embeddings=True
    )[0]

    return vec.astype("float32").tolist()
