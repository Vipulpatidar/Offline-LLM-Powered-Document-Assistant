import shutil

from fastapi import APIRouter, File, UploadFile

from core.config import settings
from core.queue import enqueue
from models.sqlite import get_all_documents_with_chunks, insert_document
from services.ingest import process_document

router = APIRouter()

UPLOAD_DIR = settings.UPLOAD_DIR


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    save_path = UPLOAD_DIR / file.filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_id = insert_document(
        filename=file.filename,
        filepath=str(save_path),
        filetype=file.content_type,
        filesize=save_path.stat().st_size,
    )

    enqueue(process_document, doc_id)
    return {"document_id": doc_id, "status": "queued"}


@router.get("/documents")
def list_documents():
    return {"documents": get_all_documents_with_chunks()}
