from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from models.faiss import remove_vectors
from models.sqlite import delete_document, delete_documents_by_filename

router = APIRouter()


@router.delete("/documents/{doc_id}")
def remove_document(doc_id: int):
    deleted = delete_document(doc_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Document not found")

    removed_vectors = remove_vectors(deleted["vector_ids"])

    file_path = Path(deleted["filepath"])
    file_deleted = False
    if file_path.exists():
        file_path.unlink(missing_ok=True)
        file_deleted = True

    return {
        "document_id": doc_id,
        "status": "deleted",
        "removed_vectors": removed_vectors,
        "file_deleted": file_deleted,
    }


@router.delete("/documents")
def remove_documents_for_file(filename: str = Query(..., min_length=1)):
    deleted = delete_documents_by_filename(filename)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    removed_vectors = remove_vectors(deleted["vector_ids"])

    file_deleted_count = 0
    for doc in deleted["documents"]:
        file_path = Path(doc["filepath"])
        if file_path.exists():
            file_path.unlink(missing_ok=True)
            file_deleted_count += 1

    return {
        "filename": filename,
        "deleted_documents": [d["document_id"] for d in deleted["documents"]],
        "status": "deleted",
        "removed_vectors": removed_vectors,
        "deleted_files": file_deleted_count,
    }
