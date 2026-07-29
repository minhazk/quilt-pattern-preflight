"""Generate the original, synthetic V1 validation corpus.

The declared expected and non-finding rule lists below are the test oracle.
They are intentionally authored independently of the rules engine output.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from uuid import UUID

from docx import Document
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen.canvas import Canvas

ROOT = Path(__file__).parent
DOCUMENTS = ROOT / "documents"
GOLDEN = ROOT / "golden"

BASE_MODEL = {
    "schema_version": "1.0.0",
    "project_id": "00000000-0000-4000-8000-000000000001",
    "document_version": 1,
    "title": "Synthetic pattern",
    "assumptions": {
        "version": 1,
        "measurement_system": "imperial",
        "seam_allowance": "1/4",
        "usable_wof": "40",
        "fabric_rounding_increment": "1/8",
        "default_measurement_state": "mixed",
        "block_rows": 1,
        "block_columns": 5,
        "waste_included": False,
        "extra_pieces_deliberate": False,
        "strip_piecing": True,
        "sashing_used": False,
        "borders_used": False,
        "complete_cutting_tables": True,
        "construction_flags": [],
    },
    "fabrics": [
        {
            "name": "Background",
            "stated_requirement": "3/8",
            "required_strip_count": 5,
            "strip_cut_width": "2 1/2",
            "allowance": "0",
            "sources": [
                {
                    "page": 2,
                    "section": "Fabric requirements",
                    "excerpt": "Background: 3/8 yard for five 2 1/2 inch WOF strips.",
                }
            ],
            "confirmed": True,
        }
    ],
    "pieces": [
        {
            "name": "Background rectangle",
            "fabric_name": "Background",
            "cut_width": "2 1/2",
            "cut_height": "4 1/2",
            "finished_width": "2",
            "finished_height": "4",
            "quantity_per_block": 8,
            "stated_total_quantity": 40,
            "extra_quantity": 0,
            "subcut_length": "4 1/2",
            "stated_strip_count": 5,
            "sources": [
                {
                    "page": 3,
                    "section": "Cutting",
                    "excerpt": "Cut (40) Background rectangles 2 1/2 x 4 1/2 inches.",
                }
            ],
            "confirmed": True,
        }
    ],
    "blocks": [
        {
            "name": "Meadow block",
            "finished_width": "12",
            "finished_height": "12",
            "quantity": 5,
            "grid_rows": 1,
            "grid_columns": 5,
            "stated_quilt_width": "60",
            "stated_quilt_height": "12",
            "vertical_sashing_total": "0",
            "horizontal_sashing_total": "0",
            "border_width_total": "0",
            "border_height_total": "0",
            "sources": [
                {
                    "page": 5,
                    "section": "Assembly",
                    "excerpt": "Arrange five 12 inch finished blocks in one row.",
                }
            ],
            "confirmed": True,
        }
    ],
    "used_piece_names": ["Background rectangle"],
}

CASES = [
    (
        "meadow_count",
        "Meadow Count",
        ["PIECE_COUNT_RECONCILIATION"],
        [],
        {"piece_total": 32},
    ),
    (
        "cedar_finish",
        "Cedar Finish",
        ["FINISHED_UNFINISHED_RELATIONSHIP"],
        [],
        {"cut_width": "2 1/4"},
    ),
    ("harbour_strips", "Harbour Strips", ["STRIP_YIELD"], [], {"strip_count": 4}),
    (
        "orchard_yardage",
        "Orchard Yardage",
        ["FABRIC_REQUIREMENT"],
        [],
        {"yardage": "1/4"},
    ),
    ("lantern_grid", "Lantern Grid", ["GRID_DIMENSIONS"], [], {"quilt_width": "58"}),
    ("fern_duplicate", "Fern Duplicate", ["DATA_CONSISTENCY"], [], {"duplicate": True}),
    (
        "river_missing_size",
        "River Missing Size",
        ["DATA_CONSISTENCY"],
        [],
        {"cut_height": None},
    ),
    (
        "stone_missing_cut",
        "Stone Missing Cut",
        ["COMPLETENESS"],
        [],
        {"used_piece": "Corner square"},
    ),
    (
        "willow_curve",
        "Willow Curve",
        ["UNSUPPORTED_CONSTRUCTION"],
        [],
        {"flag": "curves"},
    ),
    (
        "poppy_extras",
        "Poppy Extras",
        [],
        ["PIECE_COUNT_RECONCILIATION"],
        {"piece_total": 42, "extras": 2},
    ),
    (
        "bramble_review",
        "Bramble Review",
        ["PIECE_COUNT_RECONCILIATION", "FINISHED_UNFINISHED_RELATIONSHIP"],
        [],
        {"piece_total": 36, "cut_height": "4 1/4"},
    ),
    (
        "quiet_cabin",
        "Quiet Cabin",
        [],
        ["PIECE_COUNT_RECONCILIATION", "GRID_DIMENSIONS"],
        {},
    ),
    (
        "border_path",
        "Border Path",
        ["GRID_DIMENSIONS"],
        [],
        {"border_width": "4", "quilt_width": "60"},
    ),
    (
        "aster_applique",
        "Aster Applique",
        ["UNSUPPORTED_CONSTRUCTION"],
        [],
        {"flag": "applique"},
    ),
    (
        "north_block",
        "North Block",
        ["PIECE_COUNT_RECONCILIATION"],
        [],
        {"block_quantity": 6},
    ),
    (
        "fraction_field",
        "Fraction Field",
        [],
        ["FINISHED_UNFINISHED_RELATIONSHIP"],
        {"unicode_source": True},
    ),
    (
        "sparrow_yield",
        "Sparrow Yield",
        ["STRIP_YIELD"],
        [],
        {"piece_total": 48, "strip_count": 5},
    ),
    (
        "amber_pages",
        "Amber Pages",
        ["PIECE_COUNT_RECONCILIATION", "FABRIC_REQUIREMENT"],
        [],
        {"piece_total": 30, "yardage": "1/2", "pages": 3},
    ),
    (
        "pine_conflict",
        "Pine Conflict",
        ["DATA_CONSISTENCY"],
        [],
        {"duplicate": True, "pages": 2},
    ),
    (
        "thistle_scope",
        "Thistle Scope",
        ["COMPLETENESS", "UNSUPPORTED_CONSTRUCTION"],
        [],
        {"used_piece": "Template wedge", "flag": "templates", "pages": 3},
    ),
]


def apply_changes(model: dict, title: str, changes: dict, index: int) -> dict:
    result = deepcopy(model)
    result["title"] = title
    result["project_id"] = str(UUID(int=index + 1))
    piece = result["pieces"][0]
    block = result["blocks"][0]
    fabric = result["fabrics"][0]
    if "piece_total" in changes:
        piece["stated_total_quantity"] = changes["piece_total"]
    if "cut_width" in changes:
        piece["cut_width"] = changes["cut_width"]
    if "cut_height" in changes:
        piece["cut_height"] = changes["cut_height"]
    if "strip_count" in changes:
        piece["stated_strip_count"] = changes["strip_count"]
    if "yardage" in changes:
        fabric["stated_requirement"] = changes["yardage"]
    if "quilt_width" in changes:
        block["stated_quilt_width"] = changes["quilt_width"]
    if "border_width" in changes:
        block["border_width_total"] = changes["border_width"]
    if "used_piece" in changes:
        result["used_piece_names"].append(changes["used_piece"])
    if "flag" in changes:
        result["assumptions"]["construction_flags"].append(changes["flag"])
    if "extras" in changes:
        piece["extra_quantity"] = changes["extras"]
        result["assumptions"]["extra_pieces_deliberate"] = True
    if "block_quantity" in changes:
        block["quantity"] = changes["block_quantity"]
    if changes.get("duplicate"):
        duplicate = deepcopy(piece)
        duplicate["cut_width"] = "3"
        duplicate["sources"] = [
            {
                "page": 4,
                "section": "Assembly cutting reminder",
                "excerpt": "Background rectangle is listed again at 3 x 4 1/2 inches.",
            }
        ]
        result["pieces"].append(duplicate)
    return result


def document_lines(model: dict, changes: dict) -> list[str]:
    piece = model["pieces"][0]
    block = model["blocks"][0]
    fabric = model["fabrics"][0]
    height = piece["cut_height"] or "[dimension missing]"
    fraction = (
        "2½ x 4½ inches"
        if changes.get("unicode_source")
        else f"{piece['cut_width']} x {height} inches"
    )
    lines = [
        f"{model['title']} - an original synthetic quilt pattern",
        "Fabric requirements",
        f"Background fabric: {fabric['stated_requirement']} yard.",
        "Cutting instructions",
        f"Cut ({piece['stated_total_quantity']}) Background rectangles at {fraction}.",
        f"Subcut from {piece['stated_strip_count']} strips; each strip is {piece['cut_width']} x WOF.",
        "Block assembly",
        f"Make {block['quantity']} blocks. Each block uses {piece['quantity_per_block']} Background rectangles.",
        f"Each block finishes at {block['finished_width']} x {block['finished_height']} inches.",
        "Quilt assembly",
        f"Arrange {block['grid_rows']} row by {block['grid_columns']} columns.",
        f"The quilt finishes at {block['stated_quilt_width']} x {block['stated_quilt_height']} inches.",
    ]
    if changes.get("duplicate"):
        lines.append("Assembly reminder: Background rectangle is 3 x 4 1/2 inches.")
    if changes.get("used_piece"):
        lines.append(f"Add the {changes['used_piece']} during final assembly.")
    if changes.get("flag"):
        lines.append(f"Manual scope note: this variation uses {changes['flag']}.")
    return lines


def make_docx(path: Path, lines: list[str], table_heavy: bool) -> None:
    document = Document()
    document.add_heading(lines[0], level=0)
    document.add_paragraph("Synthetic validation fixture - not a commercial pattern.")
    if table_heavy:
        for heading, offset in (
            ("Fabric requirements", 2),
            ("Cutting", 4),
            ("Assembly", 7),
        ):
            document.add_heading(heading, level=1)
            table = document.add_table(rows=1, cols=2)
            table.style = "Table Grid"
            table.rows[0].cells[0].text = "Field"
            table.rows[0].cells[1].text = "Confirmed statement"
            for line in lines[offset : min(offset + 3, len(lines))]:
                cells = table.add_row().cells
                cells[0].text = heading
                cells[1].text = line
    else:
        headings = {
            "Fabric requirements",
            "Cutting instructions",
            "Block assembly",
            "Quilt assembly",
        }
        for line in lines[1:]:
            if line in headings:
                document.add_heading(line, level=1)
            else:
                document.add_paragraph(line)
    document.save(path)


def make_pdf(path: Path, lines: list[str], pages: int) -> None:
    canvas = Canvas(str(path), pagesize=letter)
    lines_per_page = max(5, (len(lines) + pages - 1) // pages)
    for page_index in range(pages):
        canvas.setFillColorRGB(0.09, 0.25, 0.2)
        canvas.setFont("Helvetica-Bold", 17)
        canvas.drawString(54, 742, lines[0])
        canvas.setFillColorRGB(0.2, 0.25, 0.22)
        canvas.setFont("Helvetica", 9)
        canvas.drawString(
            54, 724, "Synthetic validation fixture - not a commercial pattern."
        )
        canvas.setFont("Helvetica", 11)
        y = 688
        start = 1 + page_index * lines_per_page
        end = min(1 + (page_index + 1) * lines_per_page, len(lines))
        for line in lines[start:end]:
            canvas.drawString(54, y, line)
            y -= 24
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(558, 38, f"Page {page_index + 1} of {pages}")
        canvas.showPage()
    canvas.save()


def main() -> None:
    DOCUMENTS.mkdir(parents=True, exist_ok=True)
    GOLDEN.mkdir(parents=True, exist_ok=True)
    manifest = []
    for index, (slug, title, expected, non_findings, changes) in enumerate(CASES):
        model = apply_changes(BASE_MODEL, title, changes, index)
        extension = "docx" if index < 12 else "pdf"
        path = DOCUMENTS / f"{index + 1:02d}-{slug}.{extension}"
        lines = document_lines(model, changes)
        if extension == "docx":
            make_docx(path, lines, table_heavy=index >= 6)
        else:
            make_pdf(path, lines, pages=changes.get("pages", 1))
        golden = {
            "fixture": path.name,
            "description": "Original synthetic validation fixture.",
            "canonical_model": model,
            "deliberate_error_rules": expected,
            "expected_findings": expected,
            "expected_non_findings": non_findings,
            "unsupported_scope_annotations": model["assumptions"]["construction_flags"],
        }
        golden_path = GOLDEN / f"{index + 1:02d}-{slug}.json"
        golden_path.write_text(json.dumps(golden, indent=2) + "\n")
        manifest.append(
            {
                "fixture": path.name,
                "golden": golden_path.name,
                "format": extension,
                "layout": (
                    "paragraph-heavy"
                    if index < 6
                    else "table-heavy"
                    if index < 12
                    else "multi-page"
                    if changes.get("pages", 1) > 1
                    else "simple"
                ),
                "expected_findings": expected,
            }
        )
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
