from pathlib import Path
from uuid import UUID

from preflight_service.models import Block, PatternAssumptions, PatternModel, Piece, SourceReference
from preflight_service.reports import generate_report_pdf
from preflight_service.rules import run_preflight


def main() -> None:
    source = SourceReference(
        page=3,
        section="Cutting instructions",
        excerpt="Cut (32) Background rectangles at 2 1/2 x 4 1/2 inches.",
    )
    model = PatternModel(
        project_id=UUID("3d13b758-c83b-46a8-9cb0-d0d76f97c5e8"),
        title="Synthetic Meadow Lines Throw",
        assumptions=PatternAssumptions(
            block_rows=1,
            block_columns=5,
            seam_allowance="1/4",
            usable_wof="40",
            fabric_rounding_increment="1/8",
        ),
        pieces=[
            Piece(
                name="Background rectangle",
                cut_width="2 1/2",
                cut_height="4 1/2",
                quantity_per_block=8,
                stated_total_quantity=32,
                sources=[source],
            )
        ],
        blocks=[
            Block(
                name="Meadow block",
                finished_width="12",
                finished_height="12",
                quantity=5,
                grid_rows=1,
                grid_columns=5,
                stated_quilt_width="58",
                stated_quilt_height="12",
                sources=[source],
            )
        ],
        used_piece_names=["Background rectangle"],
    )
    root = Path(__file__).resolve().parents[3]
    destination = root / "apps/web/public/sample-preflight-report.pdf"
    destination.write_bytes(generate_report_pdf(model, run_preflight(model)))
    print(destination)


if __name__ == "__main__":
    main()
