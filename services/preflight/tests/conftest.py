from __future__ import annotations

from uuid import uuid4

import pytest

from preflight_service.models import (
    Block,
    Fabric,
    PatternAssumptions,
    PatternModel,
    Piece,
    SourceReference,
)


@pytest.fixture
def source() -> SourceReference:
    return SourceReference(
        page=3,
        section="Cutting",
        excerpt="Cut (32) Background rectangles 2 1/2 x 4 1/2 inches.",
    )


@pytest.fixture
def pattern(source: SourceReference) -> PatternModel:
    return PatternModel(
        project_id=uuid4(),
        title="Synthetic Meadow Lines",
        assumptions=PatternAssumptions(
            block_rows=1,
            block_columns=5,
            seam_allowance="1/4",
            usable_wof="40",
            fabric_rounding_increment="1/8",
        ),
        fabrics=[
            Fabric(
                name="Background",
                stated_requirement="1 1/4",
                required_strip_count=10,
                strip_cut_width="4 1/2",
                sources=[source],
            )
        ],
        pieces=[
            Piece(
                name="Background rectangle",
                fabric_name="Background",
                cut_width="2 1/2",
                cut_height="4 1/2",
                finished_width="2",
                finished_height="4",
                quantity_per_block=8,
                stated_total_quantity=32,
                subcut_length="4 1/2",
                stated_strip_count=4,
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
                stated_quilt_width="60",
                stated_quilt_height="12",
                sources=[source],
            )
        ],
        used_piece_names=["Background rectangle"],
    )
