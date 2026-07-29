from copy import deepcopy

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from preflight_service.models import PatternModel
from preflight_service.rules import run_preflight


def test_explainable_piece_count_finding(pattern: PatternModel) -> None:
    result = run_preflight(pattern)
    by_rule = {finding.rule_id: finding for finding in result.findings}

    assert by_rule["PIECE_COUNT_RECONCILIATION"].expected_result == "40"
    assert by_rule["PIECE_COUNT_RECONCILIATION"].stated_result == "32"
    assert by_rule["PIECE_COUNT_RECONCILIATION"].sources[0].page == 3


def test_preflight_is_idempotent(pattern: PatternModel) -> None:
    first = run_preflight(pattern)
    second = run_preflight(pattern)

    assert first.model_hash == second.model_hash
    assert [finding.model_dump(exclude={"id"}) for finding in first.findings] == [
        finding.model_dump(exclude={"id"}) for finding in second.findings
    ]


def test_unsupported_area_never_invents_math(pattern: PatternModel) -> None:
    pattern.assumptions.construction_flags = ["curves"]
    finding = next(
        item
        for item in run_preflight(pattern).findings
        if item.rule_id == "UNSUPPORTED_CONSTRUCTION"
    )

    assert finding.formula == "No calculation run"
    assert finding.severity.value == "information"
    assert "Manual technical-editor review required" in finding.recommended_action


@given(
    first_quantity=st.integers(min_value=1, max_value=500),
    extra_quantity=st.integers(min_value=0, max_value=500),
)
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_required_strip_count_never_decreases(
    pattern: PatternModel, first_quantity: int, extra_quantity: int
) -> None:
    first = deepcopy(pattern)
    second = deepcopy(pattern)
    first.pieces[0].stated_total_quantity = first_quantity
    second.pieces[0].stated_total_quantity = first_quantity + extra_quantity

    def required(model: PatternModel) -> int:
        finding = next(
            (item for item in run_preflight(model).findings if item.rule_id == "STRIP_YIELD"),
            None,
        )
        if finding:
            return int(finding.expected_result.split()[0])
        return model.pieces[0].stated_strip_count or 0

    assert required(second) >= required(first)
