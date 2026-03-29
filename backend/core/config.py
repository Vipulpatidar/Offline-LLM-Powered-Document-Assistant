# core/config.py

from pydantic import  Field, validator
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # =========================================================
    # ENVIRONMENT
    # =========================================================
    ENV: str = "dev"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # =========================================================
    # PATHS
    # =========================================================
    BASE_DIR: Path = Path(__file__).resolve().parent.parent

    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    SQLITE_PATH: Path = DATA_DIR / "metadata.db"
    FAISS_INDEX_PATH: Path = DATA_DIR / "faiss.index"
    LOG_DIR: Path = BASE_DIR / "logs"
    MODEL_DIR: Path = BASE_DIR / "model_files"

    # =========================================================
    # MODELS
    # =========================================================
    LLM_MODEL_PATH: Path = MODEL_DIR / "llm.gguf"
    EMBEDDING_MODEL_PATH: Path = MODEL_DIR / "embedding"

    CONTEXT_WINDOW: int = 8192
    MAX_GENERATION_TOKENS: int = 512
    TEMPERATURE: float = 0.7

    # =========================================================
    # CHUNKING
    # =========================================================
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 80
    MIN_CHUNK_LENGTH: int = 50
    MAX_CHUNKS_PER_DOC: int = 5000

    # =========================================================
    # RETRIEVAL
    # =========================================================
    TOP_K: int = 5
    SIMILARITY_THRESHOLD: float = 0.25
    DISTANCE_METRIC: str = "cosine"
    ENABLE_RERANK: bool = False

    # =========================================================
    # FAISS
    # =========================================================
    VECTOR_DIMENSION: int = 384
    FAISS_INDEX_TYPE: str = "IndexFlatIP"
    FAISS_USE_GPU: bool = False
    FAISS_BATCH_SIZE: int = 64

    # =========================================================
    # OCR
    # =========================================================
    OCR_ENABLED: bool = True
    OCR_ENGINE: str = "tesseract"
    OCR_LANGUAGE: str = "eng"

    # =========================================================
    # LIMITS
    # =========================================================
    MAX_FILE_SIZE_MB: int = 75
    MAX_FILES_PER_USER: int = 100
    REQUEST_TIMEOUT_SEC: int = 60
    MAX_CONCURRENT_JOBS: int = 4

    # =========================================================
    # PERFORMANCE
    # =========================================================
    ENABLE_CACHE: bool = True
    CACHE_TTL_SEC: int = 300
    PROFILE_PERFORMANCE: bool = False
    #infernce
    LLAMA_SERVER_URL: str = "http://localhost:8090"
    # =========================================================
    # VALIDATORS
    # =========================================================
    @validator("TEMPERATURE")
    def validate_temperature(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("Temperature must be between 0 and 1")
        return v

    @validator("CHUNK_OVERLAP")
    def overlap_less_than_chunk(cls, v, values):
        if "CHUNK_SIZE" in values and v >= values["CHUNK_SIZE"]:
            raise ValueError("Chunk overlap must be smaller than chunk size")
        return v

    @validator("SIMILARITY_THRESHOLD")
    def similarity_range(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("Similarity threshold must be between 0 and 1")
        return v

    # =========================================================
    # INIT
    # =========================================================
    class Config:
        env_file = ".env"
        case_sensitive = True


# single global settings object
settings = Settings()


# =============================================================
# AUTO CREATE DIRECTORIES
# =============================================================
def ensure_dirs():
    settings.DATA_DIR.mkdir(exist_ok=True)
    settings.UPLOAD_DIR.mkdir(exist_ok=True)
    settings.LOG_DIR.mkdir(exist_ok=True)


ensure_dirs()
