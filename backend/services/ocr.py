import mimetypes
from pathlib import Path

# ---- optional libs ----
import fitz  # PyMuPDF
import pandas as pd
import docx
import pytesseract
from pdf2image import convert_from_path
from PIL import Image

from docling.document_converter import DocumentConverter

# =========================================================
# INITIALIZE DOCLING
# =========================================================

docling_converter = DocumentConverter()

# =========================================================
# OCR IMPLEMENTATION
# =========================================================

def ocr_image(path: str) -> str:
    """
    OCR image using Tesseract.
    """

    try:
        print(f"[OCR] Processing image: {path}")

        img = Image.open(path)

        img = img.convert("L")

        text = pytesseract.image_to_string(img)

        print("[OCR] Image OCR completed (100%)")

        return text.strip()

    except Exception as e:
        print(f"[OCR Image Error] {path} → {e}")
        return ""


def ocr_pdf(path: str) -> str:
    """
    OCR scanned PDF using Tesseract.
    Converts pages → images → text with progress reporting.
    """

    try:

        print(f"[OCR] Starting OCR for PDF: {path}")

        images = convert_from_path(path, dpi=300)

        total_pages = len(images)

        print(f"[OCR] {total_pages} pages detected")

        text_pages = []

        for i, img in enumerate(images, start=1):

            progress = (i / total_pages) * 100

            print(f"[OCR] Processing page {i}/{total_pages} ({progress:.1f}%)")

            img = img.convert("L")

            text = pytesseract.image_to_string(img)

            if text.strip():
                text_pages.append(text)

        print("[OCR] PDF OCR completed (100%)")

        return "\n".join(text_pages)

    except Exception as e:
        print(f"[OCR PDF Error] {path} → {e}")
        return ""


# =========================================================
# PDF HELPERS
# =========================================================

def is_scanned_pdf(path: str, pages_to_check: int = 2) -> bool:
    """
    Detect if a PDF is scanned by checking only first N pages
    for extractable text.
    """

    doc = fitz.open(path)

    pages = min(len(doc), pages_to_check)

    for i in range(pages):

        text = doc.load_page(i).get_text().strip()

        if text:
            return False

    return True


def extract_pdf_text(path: str) -> str:
    """
    Extract structured text using Docling.
    Falls back to PyMuPDF if Docling fails.
    """

    try:

        print(f"[Docling] Parsing structured PDF: {path}")

        result = docling_converter.convert(path)

        doc = result.document

        elements_text = []

        for element in doc.elements:

            if hasattr(element, "text") and element.text:
                elements_text.append(element.text)

        if elements_text:
            print("[Docling] Structured extraction completed")
            return "\n".join(elements_text)

    except Exception as e:
        print(f"[Docling Parse Failed] {path} → {e}")

    # fallback to PyMuPDF
    try:

        print("[Fallback] Using PyMuPDF text extraction")

        doc = fitz.open(path)

        text = []

        for page in doc:
            text.append(page.get_text())

        print("[Fallback] PyMuPDF extraction completed")

        return "\n".join(text)

    except Exception as e:
        print(f"[PDF Fallback Error] {path} → {e}")
        return ""


# =========================================================
# FILE TYPE EXTRACTORS
# =========================================================

def extract_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_docx(path: str) -> str:
    d = docx.Document(path)
    return "\n".join(p.text for p in d.paragraphs)


def extract_csv(path: str) -> str:
    df = pd.read_csv(path)
    return df.to_string(index=False)


def extract_excel(path: str) -> str:
    df = pd.read_excel(path)
    return df.to_string(index=False)


# =========================================================
# MAIN ROUTER
# =========================================================

def extract_text_smart(filepath: str) -> str:
    """
    Smart extractor that routes file to correct parser.
    """

    path = Path(filepath)
    ext = path.suffix.lower()

    mime, _ = mimetypes.guess_type(filepath)

    try:

        # ---------- IMAGES ----------
        if mime and mime.startswith("image/"):
            return ocr_image(filepath)

        # ---------- PDF ----------
        if ext == ".pdf":

            print("[INGEST] PDF detected")

            if is_scanned_pdf(filepath):
                print("[INGEST] Scanned PDF detected → running OCR")
                return ocr_pdf(filepath)

            else:
                print("[INGEST] Digital PDF detected → using Docling")
                return extract_pdf_text(filepath)

        # ---------- TXT ----------
        if ext in [".txt", ".md", ".log"]:
            return extract_txt(filepath)

        # ---------- DOCX ----------
        if ext == ".docx":
            return extract_docx(filepath)

        # ---------- CSV ----------
        if ext == ".csv":
            return extract_csv(filepath)

        # ---------- EXCEL ----------
        if ext in [".xls", ".xlsx"]:
            return extract_excel(filepath)

        # ---------- FALLBACK ----------
        return extract_txt(filepath)

    except Exception as e:
        print(f"[Extractor Error] {filepath} → {e}")
        return ""
