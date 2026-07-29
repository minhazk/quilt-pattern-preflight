from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator


class Severity(StrEnum):
    CRITICAL = "critical"
    WARNING = "warning"
    REVIEW = "review"
    INFORMATION = "information"


class ConfirmationStatus(StrEnum):
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"
    CORRECTED = "corrected"
    REJECTED = "rejected"


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float = Field(gt=0)
    height: float = Field(gt=0)


class SourceReference(BaseModel):
    page: int | None = Field(default=None, gt=0)
    section: str | None = None
    excerpt: str = Field(min_length=1, max_length=1000)
    bounding_box: BoundingBox | None = None


class ExtractedEntity(BaseModel):
    entity_type: Literal["fabric", "piece", "dimension", "quantity", "block", "cutting_instruction"]
    value: str
    normalized_value: str
    source: SourceReference
    extraction_method: str
    confidence: float = Field(ge=0, le=1)
    confirmation_status: ConfirmationStatus = ConfirmationStatus.PROPOSED


class PatternAssumptions(BaseModel):
    version: int = Field(default=1, gt=0)
    measurement_system: Literal["imperial"] = "imperial"
    seam_allowance: str = "1/4"
    usable_wof: str = "40"
    fabric_rounding_increment: str = "1/8"
    default_measurement_state: Literal["finished", "unfinished", "mixed"] = "mixed"
    block_rows: int = Field(gt=0)
    block_columns: int = Field(gt=0)
    waste_included: bool = False
    extra_pieces_deliberate: bool = False
    strip_piecing: bool = False
    sashing_used: bool = False
    borders_used: bool = False
    complete_cutting_tables: bool = True
    construction_flags: list[str] = Field(default_factory=list)


class Fabric(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(min_length=1)
    stated_requirement: str | None = None
    required_strip_count: int | None = Field(default=None, ge=0)
    strip_cut_width: str | None = None
    allowance: str = "0"
    sources: list[SourceReference] = Field(default_factory=list)
    confirmed: bool = True


class Piece(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(min_length=1)
    fabric_name: str | None = None
    cut_width: str | None = None
    cut_height: str | None = None
    finished_width: str | None = None
    finished_height: str | None = None
    quantity_per_block: int | None = Field(default=None, ge=0)
    stated_total_quantity: int | None = Field(default=None, ge=0)
    extra_quantity: int = Field(default=0, ge=0)
    subcut_length: str | None = None
    stated_strip_count: int | None = Field(default=None, ge=0)
    sources: list[SourceReference] = Field(default_factory=list)
    confirmed: bool = True


class Block(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(min_length=1)
    finished_width: str | None = None
    finished_height: str | None = None
    unfinished_width: str | None = None
    unfinished_height: str | None = None
    quantity: int = Field(gt=0)
    grid_rows: int | None = Field(default=None, gt=0)
    grid_columns: int | None = Field(default=None, gt=0)
    stated_quilt_width: str | None = None
    stated_quilt_height: str | None = None
    vertical_sashing_total: str = "0"
    horizontal_sashing_total: str = "0"
    border_width_total: str = "0"
    border_height_total: str = "0"
    sources: list[SourceReference] = Field(default_factory=list)
    confirmed: bool = True


class PatternModel(BaseModel):
    schema_version: str = "1.0.0"
    project_id: UUID = Field(default_factory=uuid4)
    document_version: int = Field(default=1, gt=0)
    title: str = Field(min_length=1)
    assumptions: PatternAssumptions
    fabrics: list[Fabric] = Field(default_factory=list)
    pieces: list[Piece] = Field(default_factory=list)
    blocks: list[Block] = Field(default_factory=list)
    used_piece_names: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_confirmed_structure(self) -> PatternModel:
        if not self.pieces and not self.blocks:
            raise ValueError("A confirmed model needs at least one piece or block")
        return self


class Finding(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    rule_id: str
    rule_version: str
    severity: Severity
    category: str
    title: str
    explanation: str
    formula: str
    operands: dict[str, str]
    expected_result: str
    stated_result: str
    difference: str
    confidence: float = Field(ge=0, le=1)
    sources: list[SourceReference]
    assumptions: list[str]
    recommended_action: str
    limitation: str | None = None


class PreflightResult(BaseModel):
    engine_version: str
    rule_versions: dict[str, str]
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    model_hash: str
    findings: list[Finding]
    checked_areas: list[str]
    unsupported_areas: list[str]


class ExtractionResult(BaseModel):
    filename: str
    file_type: Literal["docx", "pdf"]
    page_count: int
    text_layer_available: bool
    structural_suitability: Literal["suitable", "review", "unsupported"]
    plain_text_length: int
    entities: list[ExtractedEntity]
    warnings: list[str] = Field(default_factory=list)


class ApprovedReportRequest(BaseModel):
    """A persisted, operator-approved result ready for PDF rendering."""

    model: PatternModel
    result: PreflightResult
