from __future__ import annotations

import json
from pathlib import Path

import pytest

from preflight_service.extraction import extract_document
from preflight_service.models import PatternModel
from preflight_service.rules import run_preflight

ROOT = Path(__file__).parents[3] / "fixtures"
GOLDEN_FILES = sorted((ROOT / "golden").glob("*.json"))


@pytest.mark.parametrize("golden_path", GOLDEN_FILES, ids=lambda path: path.stem)
def test_golden_rule_expectations(golden_path: Path) -> None:
    golden = json.loads(golden_path.read_text())
    model = PatternModel.model_validate(golden["canonical_model"])
    actual_rules = {finding.rule_id for finding in run_preflight(model).findings}

    assert set(golden["expected_findings"]) <= actual_rules
    assert not set(golden["expected_non_findings"]) & actual_rules


@pytest.mark.parametrize("golden_path", GOLDEN_FILES, ids=lambda path: path.stem)
def test_fixture_is_extractable(golden_path: Path) -> None:
    golden = json.loads(golden_path.read_text())
    document = ROOT / "documents" / golden["fixture"]
    mime = (
        "application/pdf"
        if document.suffix == ".pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    result = extract_document(document.name, mime, document.read_bytes())

    assert result.text_layer_available
    assert result.plain_text_length >= 40
    assert result.entities
