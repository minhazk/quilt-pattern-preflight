from io import BytesIO

import pytest
from docx import Document
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from preflight_service.extraction import ExtractionError, extract_document


def make_docx() -> bytes:
    stream = BytesIO()
    document = Document()
    document.add_heading("Background cutting", level=1)
    document.add_paragraph('From Background fabric, cut (32) 2½" x 4½" rectangles.')
    table = document.add_table(rows=2, cols=3)
    table.rows[0].cells[0].text = "Piece"
    table.rows[0].cells[1].text = "Size"
    table.rows[0].cells[2].text = "Quantity"
    table.rows[1].cells[0].text = "Accent strip"
    table.rows[1].cells[1].text = "4 1/2 x WOF"
    table.rows[1].cells[2].text = "Cut 10"
    document.save(stream)
    return stream.getvalue()


def make_pdf(text: str) -> bytes:
    stream = BytesIO()
    pdf = canvas.Canvas(stream, pagesize=letter)
    if text:
        pdf.drawString(72, 720, text)
    pdf.drawString(72, 700, "Make 5 blocks using 8 rectangles per block." if text else "")
    pdf.save()
    return stream.getvalue()


def test_docx_paragraph_and_table_extraction() -> None:
    result = extract_document(
        "synthetic.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        make_docx(),
    )
    assert result.file_type == "docx"
    assert any(entity.normalized_value == "2 1/2 x 4 1/2" for entity in result.entities)
    assert any(entity.source.section == "Table 1, row 2" for entity in result.entities)


def test_text_layer_pdf_extraction_has_page_and_bbox() -> None:
    result = extract_document(
        "synthetic.pdf",
        "application/pdf",
        make_pdf("Cut (32) Background rectangles 2 1/2 x 4 1/2 inches."),
    )
    assert result.page_count == 1
    assert result.entities[0].source.page == 1
    assert result.entities[0].source.bounding_box is not None


@pytest.mark.parametrize(
    ("filename", "mime", "content"),
    [
        ("../escape.pdf", "application/pdf", b"%PDF unsafe"),
        ("pattern.exe", "application/octet-stream", b"MZ"),
        ("fake.pdf", "application/pdf", b"not a pdf"),
        ("fake.docx", "application/pdf", b"PK not really docx"),
    ],
)
def test_malicious_or_mismatched_uploads_are_rejected(
    filename: str, mime: str, content: bytes
) -> None:
    with pytest.raises(ExtractionError):
        extract_document(filename, mime, content)


def test_image_only_pdf_is_rejected() -> None:
    with pytest.raises(ExtractionError, match="No usable text layer"):
        extract_document("scan.pdf", "application/pdf", make_pdf(""))
