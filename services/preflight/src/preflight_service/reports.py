from __future__ import annotations

import io
from datetime import date
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import PatternModel, PreflightResult

FOREST = colors.HexColor("#173F32")
RUST = colors.HexColor("#B4533B")
CREAM = colors.HexColor("#F7F2E7")
MUTED = colors.HexColor("#536259")


def generate_report_pdf(model: PatternModel, result: PreflightResult) -> bytes:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"{model.title} preflight report",
        author="Quilt Pattern Preflight",
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=32,
            textColor=FOREST,
            spaceAfter=8 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            "Eyebrow",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=9,
            textColor=RUST,
            spaceAfter=3 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            "Small",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=MUTED,
        )
    )
    styles.add(
        ParagraphStyle(
            "Formula",
            parent=styles["Small"],
            textColor=colors.white,
        )
    )
    styles.add(
        ParagraphStyle(
            "FindingTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=21,
            textColor=FOREST,
            spaceAfter=3 * mm,
        )
    )
    metric_style = ParagraphStyle(
        "Metric",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        fontSize=10,
        leading=16,
        textColor=colors.white,
    )
    story = [
        Paragraph("OPERATOR-REVIEWED BETA", styles["Eyebrow"]),
        Paragraph(model.title, styles["ReportTitle"]),
        Paragraph(
            f"Mathematical preflight report · document version "
            f"{model.document_version} · {date.today().isoformat()}",
            styles["Small"],
        ),
        Spacer(1, 8 * mm),
        Table(
            [
                [
                    Paragraph(
                        f"<b>{len(result.findings)}</b><br/>source-linked findings",
                        metric_style,
                    ),
                    Paragraph(
                        f"<b>{len(result.checked_areas)}</b><br/>checked areas",
                        metric_style,
                    ),
                    Paragraph(
                        f"<b>{len(result.unsupported_areas)}</b><br/>unsupported areas",
                        metric_style,
                    ),
                ]
            ],
            colWidths=[55 * mm] * 3,
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), FOREST),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.white),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.white),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            ),
        ),
        Spacer(1, 8 * mm),
        Paragraph("SCOPE AND LIMITATIONS", styles["Eyebrow"]),
        Paragraph(
            "This report checks internal arithmetic consistency only within the "
            "supported and customer-confirmed scope. It does not replace professional "
            "technical editing, pattern testing, construction judgement, or the "
            "designer's final review.",
            styles["BodyText"],
        ),
        PageBreak(),
        Paragraph("ASSUMPTIONS USED", styles["Eyebrow"]),
        Table(
            [
                ["Seam allowance", model.assumptions.seam_allowance + '"'],
                ["Usable WOF", model.assumptions.usable_wof + '"'],
                [
                    "Fabric rounding",
                    model.assumptions.fabric_rounding_increment + " yd",
                ],
                [
                    "Grid",
                    f"{model.assumptions.block_rows} rows × "
                    f"{model.assumptions.block_columns} columns",
                ],
                [
                    "Construction flags",
                    ", ".join(model.assumptions.construction_flags) or "None",
                ],
            ],
            colWidths=[60 * mm, 105 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), CREAM),
                    ("TEXTCOLOR", (0, 0), (-1, -1), FOREST),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D7D2C7")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            ),
        ),
        Spacer(1, 10 * mm),
    ]

    if not result.findings:
        story.extend(
            [
                Paragraph("RESULT", styles["Eyebrow"]),
                Paragraph(
                    "No contradictions were found within the supported and confirmed scope.",
                    styles["FindingTitle"],
                ),
            ]
        )

    for index, finding in enumerate(result.findings, start=1):
        if index > 1:
            story.append(PageBreak())
        source_text = "<br/>".join(
            f"<b>{'Page ' + str(source.page) if source.page else source.section}</b>: "
            f"{source.excerpt}"
            for source in finding.sources
        )
        operands = "<br/>".join(
            f"{label}: <b>{value}</b>" for label, value in finding.operands.items()
        )
        story.append(
            KeepTogether(
                [
                    Paragraph(
                        f"FINDING {index} · {finding.severity.value.upper()} · "
                        f"{finding.rule_id} v{finding.rule_version}",
                        styles["Eyebrow"],
                    ),
                    Paragraph(finding.title, styles["FindingTitle"]),
                    Paragraph(finding.explanation, styles["BodyText"]),
                    Spacer(1, 3 * mm),
                    Table(
                        [
                            [
                                Paragraph(
                                    f"<b>Formula</b><br/>{finding.formula}<br/><br/>{operands}",
                                    styles["Formula"],
                                ),
                                Paragraph(
                                    f"<b>Expected</b><br/>{finding.expected_result}"
                                    f"<br/><br/><b>Stated</b><br/>{finding.stated_result}"
                                    f"<br/><br/><b>Difference</b><br/>{finding.difference}",
                                    styles["Small"],
                                ),
                            ]
                        ],
                        colWidths=[105 * mm, 60 * mm],
                        style=TableStyle(
                            [
                                ("BACKGROUND", (0, 0), (0, 0), FOREST),
                                ("TEXTCOLOR", (0, 0), (0, 0), colors.white),
                                ("BACKGROUND", (1, 0), (1, 0), CREAM),
                                ("BOX", (0, 0), (-1, -1), 0.4, FOREST),
                                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                                ("TOPPADDING", (0, 0), (-1, -1), 8),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                            ]
                        ),
                    ),
                    Spacer(1, 3 * mm),
                    Paragraph("<b>Source evidence</b><br/>" + source_text, styles["Small"]),
                    Spacer(1, 2 * mm),
                    Paragraph(
                        "<b>Recommended manual action</b><br/>" + finding.recommended_action,
                        styles["Small"],
                    ),
                    Spacer(1, 10 * mm),
                ]
            )
        )

    def footer(canvas: Any, doc: Any) -> None:
        canvas.saveState()
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(20 * mm, 10 * mm, "Quilt Pattern Preflight · beta")
        canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f"Page {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
