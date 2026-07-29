from io import BytesIO

from fastapi.testclient import TestClient
from pypdf import PdfReader

from preflight_service.api import app
from preflight_service.models import PatternModel


def test_health_does_not_expose_configuration() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "engine": "deterministic"}


def test_preflight_and_pdf_report(pattern: PatternModel) -> None:
    client = TestClient(app)
    payload = pattern.model_dump(mode="json")

    result = client.post("/v1/preflight", json=payload)
    assert result.status_code == 200
    assert result.json()["findings"]

    report = client.post("/v1/report.pdf", json=payload)
    assert report.status_code == 200
    assert report.headers["content-type"] == "application/pdf"
    reader = PdfReader(BytesIO(report.content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert pattern.title in text
    assert "PIECE_COUNT_RECONCILIATION" in text
    assert len(reader.pages) >= 2
