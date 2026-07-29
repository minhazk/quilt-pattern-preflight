from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from fractions import Fraction

from .measurements import (
    ceil_fraction,
    floor_fraction,
    format_fraction,
    parse_measurement,
    round_up_to_increment,
    yards_from_inches,
)
from .models import (
    Finding,
    PatternModel,
    Piece,
    PreflightResult,
    Severity,
    SourceReference,
)

ENGINE_VERSION = "1.0.0"
RULE_VERSIONS = {
    "DATA_CONSISTENCY": "1.0.0",
    "PIECE_COUNT_RECONCILIATION": "1.0.0",
    "FINISHED_UNFINISHED_RELATIONSHIP": "1.0.0",
    "STRIP_YIELD": "1.0.0",
    "FABRIC_REQUIREMENT": "1.0.0",
    "GRID_DIMENSIONS": "1.0.0",
    "COMPLETENESS": "1.0.0",
    "UNSUPPORTED_CONSTRUCTION": "1.0.0",
}

FALLBACK_SOURCE = SourceReference(
    section="Customer-confirmed model",
    excerpt="Value confirmed in the extraction review interface.",
)


def _sources(*source_groups: list[SourceReference]) -> list[SourceReference]:
    merged = [source for group in source_groups for source in group]
    return merged or [FALLBACK_SOURCE]


def _difference(actual: Fraction, expected: Fraction, unit: str = "") -> str:
    delta = actual - expected
    if delta == 0:
        return f"0{unit}"
    direction = "more than expected" if delta > 0 else "fewer than expected"
    return f"{format_fraction(abs(delta))}{unit} {direction}"


def _model_hash(model: PatternModel) -> str:
    canonical = json.dumps(model.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


def _data_consistency(model: PatternModel) -> list[Finding]:
    findings: list[Finding] = []
    pieces_by_name: dict[str, list[Piece]] = defaultdict(list)
    for piece in model.pieces:
        pieces_by_name[piece.name.casefold()].append(piece)
        if piece.confirmed and (piece.cut_width is None or piece.cut_height is None):
            findings.append(
                Finding(
                    rule_id="DATA_CONSISTENCY",
                    rule_version=RULE_VERSIONS["DATA_CONSISTENCY"],
                    severity=Severity.REVIEW,
                    category="Data consistency",
                    title=f"{piece.name} is missing a cut dimension",
                    explanation=(
                        "The confirmed piece does not include both cut dimensions, "
                        "so dimension-dependent checks cannot run."
                    ),
                    formula="No calculation run",
                    operands={},
                    expected_result="Cut width and cut height",
                    stated_result="Incomplete dimensions",
                    difference="Manual confirmation required",
                    confidence=1,
                    sources=_sources(piece.sources),
                    assumptions=["Piece is included in the confirmed model"],
                    recommended_action=(
                        "Confirm the missing dimension or mark the piece as intentionally "
                        "outside the supported scope."
                    ),
                )
            )

    for duplicates in pieces_by_name.values():
        dimensions = {(piece.cut_width, piece.cut_height) for piece in duplicates}
        if len(duplicates) > 1 and len(dimensions) > 1:
            name = duplicates[0].name
            findings.append(
                Finding(
                    rule_id="DATA_CONSISTENCY",
                    rule_version=RULE_VERSIONS["DATA_CONSISTENCY"],
                    severity=Severity.WARNING,
                    category="Data consistency",
                    title=f"{name} has conflicting dimensions",
                    explanation=(
                        "The same confirmed piece name appears with more than one cut size."
                    ),
                    formula="Compare normalized cut width × cut height by piece name",
                    operands={
                        f"Occurrence {index + 1}": f"{piece.cut_width} × {piece.cut_height}"
                        for index, piece in enumerate(duplicates)
                    },
                    expected_result="One consistent dimension",
                    stated_result=f"{len(dimensions)} different dimensions",
                    difference="Conflicting definitions",
                    confidence=1,
                    sources=_sources(*(piece.sources for piece in duplicates)),
                    assumptions=["Piece names refer to the same piece"],
                    recommended_action=(
                        "Rename intentionally different pieces or correct the conflicting size."
                    ),
                )
            )
    return findings


def _piece_counts(model: PatternModel) -> list[Finding]:
    findings: list[Finding] = []
    for piece in model.pieces:
        if (
            not piece.confirmed
            or piece.quantity_per_block is None
            or piece.stated_total_quantity is None
        ):
            continue
        applicable_blocks = [block for block in model.blocks if block.confirmed]
        if len(applicable_blocks) != 1:
            continue
        block = applicable_blocks[0]
        expected = piece.quantity_per_block * block.quantity + piece.extra_quantity
        if expected == piece.stated_total_quantity:
            continue
        delta = piece.stated_total_quantity - expected
        direction = "more" if delta > 0 else "fewer"
        findings.append(
            Finding(
                rule_id="PIECE_COUNT_RECONCILIATION",
                rule_version=RULE_VERSIONS["PIECE_COUNT_RECONCILIATION"],
                severity=Severity.CRITICAL,
                category="Piece quantities",
                title=f"{abs(delta)} {piece.name} pieces are {direction} than expected",
                explanation=(
                    f"The cutting total states {piece.stated_total_quantity}, while the "
                    f"confirmed assembly relationship requires {expected}."
                ),
                formula="(quantity per block × block quantity) + deliberate extras",
                operands={
                    "Quantity per block": str(piece.quantity_per_block),
                    "Block quantity": str(block.quantity),
                    "Deliberate extras": str(piece.extra_quantity),
                },
                expected_result=str(expected),
                stated_result=str(piece.stated_total_quantity),
                difference=f"{abs(delta)} {direction} than expected",
                confidence=1,
                sources=_sources(piece.sources, block.sources),
                assumptions=[
                    f"{block.quantity} {block.name} blocks confirmed",
                    (
                        f"{piece.extra_quantity} deliberate extra pieces confirmed"
                        if piece.extra_quantity
                        else "No deliberate extra pieces"
                    ),
                ],
                recommended_action=(
                    "Check whether the cutting quantity, pieces per block, or block "
                    "quantity is incorrect."
                ),
            )
        )
    return findings


def _finished_unfinished(model: PatternModel) -> list[Finding]:
    findings: list[Finding] = []
    seam = parse_measurement(model.assumptions.seam_allowance)
    for piece in model.pieces:
        for axis in ("width", "height"):
            cut = getattr(piece, f"cut_{axis}")
            finished = getattr(piece, f"finished_{axis}")
            if not piece.confirmed or cut is None or finished is None:
                continue
            actual = parse_measurement(cut)
            expected = parse_measurement(finished) + 2 * seam
            if actual == expected:
                continue
            findings.append(
                Finding(
                    rule_id="FINISHED_UNFINISHED_RELATIONSHIP",
                    rule_version=RULE_VERSIONS["FINISHED_UNFINISHED_RELATIONSHIP"],
                    severity=Severity.WARNING,
                    category="Dimensions",
                    title=(f"{piece.name} cut {axis} does not produce its stated finished {axis}"),
                    explanation=(
                        f"With a confirmed {format_fraction(seam)} inch seam allowance "
                        f"on both sides, the cut {axis} should be "
                        f"{format_fraction(expected)} inches."
                    ),
                    formula="finished dimension + (2 × seam allowance)",
                    operands={
                        f"Finished {axis}": format_fraction(parse_measurement(finished)),
                        "Seam allowance": format_fraction(seam),
                    },
                    expected_result=f'{format_fraction(expected)}"',
                    stated_result=f'{format_fraction(actual)}"',
                    difference=_difference(actual, expected, '"'),
                    confidence=0.98,
                    sources=_sources(piece.sources),
                    assumptions=[
                        "Straight-seam relationship confirmed",
                        f'{format_fraction(seam)}" seam allowance confirmed',
                    ],
                    recommended_action=(
                        f"Confirm whether the cut {axis} or finished {axis} label should change."
                    ),
                )
            )
    return findings


def _strip_yield(model: PatternModel) -> list[Finding]:
    findings: list[Finding] = []
    wof = parse_measurement(model.assumptions.usable_wof)
    for piece in model.pieces:
        if (
            not piece.confirmed
            or piece.subcut_length is None
            or piece.stated_strip_count is None
            or piece.stated_total_quantity is None
        ):
            continue
        subcut = parse_measurement(piece.subcut_length)
        yield_per_strip = floor_fraction(wof / subcut)
        if yield_per_strip <= 0:
            continue
        required = ceil_fraction(Fraction(piece.stated_total_quantity, yield_per_strip))
        if required == piece.stated_strip_count:
            continue
        delta = piece.stated_strip_count - required
        findings.append(
            Finding(
                rule_id="STRIP_YIELD",
                rule_version=RULE_VERSIONS["STRIP_YIELD"],
                severity=Severity.CRITICAL if delta < 0 else Severity.REVIEW,
                category="Strip yield",
                title=(
                    f"{piece.name} needs {abs(delta)} "
                    f"{'more' if delta < 0 else 'fewer'} WOF strip"
                    f"{'s' if abs(delta) != 1 else ''}"
                ),
                explanation=(
                    f"A {format_fraction(wof)} inch usable width yields "
                    f"{yield_per_strip} subcuts at {format_fraction(subcut)} inches. "
                    f"{piece.stated_total_quantity} pieces therefore need {required} strips."
                ),
                formula=(
                    "floor(usable WOF ÷ subcut length); ceil(required quantity ÷ yield per strip)"
                ),
                operands={
                    "Usable WOF": format_fraction(wof),
                    "Subcut length": format_fraction(subcut),
                    "Required pieces": str(piece.stated_total_quantity),
                    "Yield per strip": str(yield_per_strip),
                },
                expected_result=f"{required} strips",
                stated_result=f"{piece.stated_strip_count} strips",
                difference=f"{abs(delta)} {'short' if delta < 0 else 'surplus'}",
                confidence=0.98,
                sources=_sources(piece.sources),
                assumptions=[
                    "Subcut orientation confirmed",
                    "No directional-print or fussy-cutting allowance",
                ],
                recommended_action=(
                    "Confirm strip orientation and increase the stated strip count "
                    "if the confirmed inputs are correct."
                ),
                limitation=(
                    "Does not account for unsupported nesting, directional fabric, "
                    "fussy cutting, shrinkage, or unconfirmed waste."
                ),
            )
        )
    return findings


def _fabric_requirements(model: PatternModel) -> list[Finding]:
    findings: list[Finding] = []
    increment = parse_measurement(model.assumptions.fabric_rounding_increment)
    for fabric in model.fabrics:
        if (
            not fabric.confirmed
            or fabric.required_strip_count is None
            or fabric.strip_cut_width is None
            or fabric.stated_requirement is None
        ):
            continue
        raw_inches = fabric.required_strip_count * parse_measurement(
            fabric.strip_cut_width
        ) + parse_measurement(fabric.allowance)
        raw_yards = yards_from_inches(raw_inches)
        expected = round_up_to_increment(raw_yards, increment)
        stated = parse_measurement(fabric.stated_requirement)
        if expected == stated:
            continue
        findings.append(
            Finding(
                rule_id="FABRIC_REQUIREMENT",
                rule_version=RULE_VERSIONS["FABRIC_REQUIREMENT"],
                severity=Severity.WARNING,
                category="Fabric requirements",
                title=f"{fabric.name} stated yardage does not match confirmed strips",
                explanation=(
                    f"{fabric.required_strip_count} strips at "
                    f'{fabric.strip_cut_width}" require {format_fraction(raw_yards)} '
                    f"yards before rounding, or {format_fraction(expected)} yards "
                    f"rounded upward to the confirmed increment."
                ),
                formula=(
                    "(required strips × strip cut width + allowance) ÷ 36; "
                    "round upward to increment"
                ),
                operands={
                    "Required strips": str(fabric.required_strip_count),
                    "Strip cut width": fabric.strip_cut_width,
                    "Allowance": fabric.allowance,
                    "Rounding increment": format_fraction(increment),
                },
                expected_result=f"{format_fraction(expected)} yd",
                stated_result=f"{format_fraction(stated)} yd",
                difference=_difference(stated, expected, " yd"),
                confidence=0.97,
                sources=_sources(fabric.sources),
                assumptions=[
                    "WOF strip usage confirmed",
                    "Only the stated allowance is included",
                ],
                recommended_action=(
                    "Confirm the strip count, cut width, allowance, and stated yardage."
                ),
                limitation=(
                    "Does not account for unsupported nesting, directional fabric, "
                    "fussy cutting, shrinkage, or unconfirmed waste."
                ),
            )
        )
    return findings


def _grid_dimensions(model: PatternModel) -> list[Finding]:
    findings: list[Finding] = []
    for block in model.blocks:
        if (
            not block.confirmed
            or block.grid_rows is None
            or block.grid_columns is None
            or block.finished_width is None
            or block.finished_height is None
            or block.stated_quilt_width is None
            or block.stated_quilt_height is None
        ):
            continue
        width = (
            block.grid_columns * parse_measurement(block.finished_width)
            + parse_measurement(block.vertical_sashing_total)
            + parse_measurement(block.border_width_total)
        )
        height = (
            block.grid_rows * parse_measurement(block.finished_height)
            + parse_measurement(block.horizontal_sashing_total)
            + parse_measurement(block.border_height_total)
        )
        stated_width = parse_measurement(block.stated_quilt_width)
        stated_height = parse_measurement(block.stated_quilt_height)
        if width == stated_width and height == stated_height:
            continue
        findings.append(
            Finding(
                rule_id="GRID_DIMENSIONS",
                rule_version=RULE_VERSIONS["GRID_DIMENSIONS"],
                severity=Severity.CRITICAL,
                category="Quilt dimensions",
                title=f"{block.name} grid does not match the stated quilt dimensions",
                explanation=(
                    f"The confirmed simple grid calculates to {format_fraction(width)} × "
                    f"{format_fraction(height)} inches, while the document states "
                    f"{format_fraction(stated_width)} × "
                    f"{format_fraction(stated_height)} inches."
                ),
                formula=(
                    "(columns × block finished width) + vertical sashing + borders; "
                    "(rows × block finished height) + horizontal sashing + borders"
                ),
                operands={
                    "Grid": f"{block.grid_rows} rows × {block.grid_columns} columns",
                    "Block": f"{block.finished_width} × {block.finished_height} inches",
                    "Vertical sashing total": block.vertical_sashing_total,
                    "Horizontal sashing total": block.horizontal_sashing_total,
                    "Border width total": block.border_width_total,
                    "Border height total": block.border_height_total,
                },
                expected_result=f'{format_fraction(width)}" × {format_fraction(height)}"',
                stated_result=(
                    f'{format_fraction(stated_width)}" × {format_fraction(stated_height)}"'
                ),
                difference=(
                    f"Width {_difference(stated_width, width, chr(34))}; "
                    f"height {_difference(stated_height, height, chr(34))}"
                ),
                confidence=0.99,
                sources=_sources(block.sources),
                assumptions=[
                    "Simple rectangular layout confirmed",
                    "Sashing and border totals explicitly confirmed",
                ],
                recommended_action=(
                    "Check the stated quilt size, grid, block size, sashing, and border totals."
                ),
            )
        )
    return findings


def _completeness(model: PatternModel) -> list[Finding]:
    findings: list[Finding] = []
    piece_names = {piece.name.casefold() for piece in model.pieces}
    for used_name in model.used_piece_names:
        if used_name.casefold() in piece_names:
            continue
        findings.append(
            Finding(
                rule_id="COMPLETENESS",
                rule_version=RULE_VERSIONS["COMPLETENESS"],
                severity=Severity.REVIEW,
                category="Completeness",
                title=f"{used_name} has no confirmed cutting instruction",
                explanation=(
                    "The confirmed assembly uses this piece, but the confirmed cutting "
                    "model contains no matching piece."
                ),
                formula="Confirmed assembly piece names − confirmed cutting piece names",
                operands={"Assembly piece": used_name},
                expected_result="Matching cutting instruction",
                stated_result="No matching piece",
                difference="Manual confirmation required",
                confidence=0.92,
                sources=[FALLBACK_SOURCE],
                assumptions=["Piece-name mapping confirmed by the customer"],
                recommended_action=(
                    "Add or map the missing cutting instruction, or mark the assembly "
                    "reference as unsupported."
                ),
            )
        )
    return findings


def _unsupported(model: PatternModel) -> list[Finding]:
    return [
        Finding(
            rule_id="UNSUPPORTED_CONSTRUCTION",
            rule_version=RULE_VERSIONS["UNSUPPORTED_CONSTRUCTION"],
            severity=Severity.INFORMATION,
            category="Supported scope",
            title=f"{flag.replace('_', ' ').title()} requires manual review",
            explanation=(
                f"{flag.replace('_', ' ')} was confirmed or suspected. No arithmetic "
                "result was inferred for this construction."
            ),
            formula="No calculation run",
            operands={},
            expected_result="Manual technical-editor review",
            stated_result=f"{flag.replace('_', ' ').title()} present",
            difference="Not applicable",
            confidence=1,
            sources=[FALLBACK_SOURCE],
            assumptions=[f"Customer construction flag: {flag}"],
            recommended_action=(
                "Manual technical-editor review required. This construction is outside "
                "the current preflight scope."
            ),
            limitation="No result was invented for the unsupported area.",
        )
        for flag in model.assumptions.construction_flags
    ]


def run_preflight(model: PatternModel) -> PreflightResult:
    rule_functions = (
        _data_consistency,
        _piece_counts,
        _finished_unfinished,
        _strip_yield,
        _fabric_requirements,
        _grid_dimensions,
        _completeness,
        _unsupported,
    )
    findings = [finding for rule in rule_functions for finding in rule(model)]
    severity_order = {
        Severity.CRITICAL: 0,
        Severity.WARNING: 1,
        Severity.REVIEW: 2,
        Severity.INFORMATION: 3,
    }
    findings.sort(
        key=lambda finding: (
            severity_order[finding.severity],
            finding.rule_id,
            finding.title,
        )
    )
    return PreflightResult(
        engine_version=ENGINE_VERSION,
        rule_versions=RULE_VERSIONS,
        model_hash=_model_hash(model),
        findings=findings,
        checked_areas=[
            "data consistency",
            "piece quantities",
            "finished and unfinished dimensions",
            "strip yield",
            "fabric requirements",
            "simple grid dimensions",
            "completeness",
        ],
        unsupported_areas=model.assumptions.construction_flags,
    )
