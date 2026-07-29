from __future__ import annotations

import hmac
import os

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import Response

from .extraction import ExtractionError, extract_document
from .models import ApprovedReportRequest, ExtractionResult, PatternModel, PreflightResult
from .reports import generate_report_pdf
from .rules import run_preflight

app = FastAPI(
    title="Quilt Pattern Preflight Service",
    version="0.1.0",
    docs_url="/docs" if os.getenv("PREFLIGHT_EXPOSE_DOCS") == "true" else None,
    redoc_url=None,
)


def require_service_secret(
    x_preflight_secret: str | None = Header(default=None),
) -> None:
    expected = os.getenv("PREFLIGHT_API_SECRET")
    if not expected:
        if os.getenv("ENVIRONMENT", "development") == "development":
            return
        raise HTTPException(status_code=503, detail="Service authentication unavailable")
    if x_preflight_secret is None or not hmac.compare_digest(x_preflight_secret, expected):
        raise HTTPException(status_code=401, detail="Invalid service credentials")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "engine": "deterministic"}


@app.post("/v1/extract", dependencies=[Depends(require_service_secret)])
async def extract(file: UploadFile = File(...)) -> ExtractionResult:
    content = await file.read()
    try:
        return extract_document(file.filename or "upload", file.content_type, content)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post(
    "/v1/preflight",
    response_model=PreflightResult,
    dependencies=[Depends(require_service_secret)],
)
def preflight(model: PatternModel) -> PreflightResult:
    return run_preflight(model)


@app.post("/v1/report.pdf", dependencies=[Depends(require_service_secret)])
def report(model: PatternModel) -> Response:
    result = run_preflight(model)
    content = generate_report_pdf(model, result)
    return Response(
        content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="preflight-report.pdf"',
            "Cache-Control": "private, no-store",
        },
    )


@app.post("/v1/approved-report.pdf", dependencies=[Depends(require_service_secret)])
def approved_report(payload: ApprovedReportRequest) -> Response:
    """Render the persisted operator-approved snapshot without rerunning rules."""
    content = generate_report_pdf(payload.model, payload.result)
    return Response(
        content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="preflight-report.pdf"',
            "Cache-Control": "private, no-store",
        },
    )
