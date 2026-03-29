from fastapi import APIRouter
from models.sqlite import get_all_documents_with_chunks

router = APIRouter()

@router.get("/documents")
def list_documents():
    """
    List all uploaded documents with details.
    """
    docs = get_all_documents_with_chunks()
    return docs