"use client";

import { useState } from "react";

type PieceDraft = {
  key: number;
  name: string;
  fabric: string;
  cutWidth: string;
  cutHeight: string;
  finishedWidth: string;
  finishedHeight: string;
  quantityPerBlock: string;
  statedTotal: string;
  subcutLength: string;
  statedStripCount: string;
};

type FabricDraft = {
  key: number;
  name: string;
  statedRequirement: string;
  requiredStripCount: string;
  stripCutWidth: string;
  allowance: string;
};

let nextKey = 10;

export function ModelFields({
  initialCutWidth,
  initialCutHeight,
  initialTotal,
  initialFinishedWidth,
  initialFinishedHeight,
  initialBlockQuantity,
  initialQuiltWidth,
  initialQuiltHeight,
}: {
  initialCutWidth: string;
  initialCutHeight: string;
  initialTotal: string;
  initialFinishedWidth: string;
  initialFinishedHeight: string;
  initialBlockQuantity: string;
  initialQuiltWidth: string;
  initialQuiltHeight: string;
}) {
  const [fabrics, setFabrics] = useState<FabricDraft[]>([]);
  const [pieces, setPieces] = useState<PieceDraft[]>([
    {
      key: 1,
      name: "Primary piece",
      fabric: "",
      cutWidth: initialCutWidth,
      cutHeight: initialCutHeight,
      finishedWidth: "",
      finishedHeight: "",
      quantityPerBlock: "1",
      statedTotal: initialTotal,
      subcutLength: "",
      statedStripCount: "",
    },
  ]);

  return (
    <>
      <section className="repeatable-model-section">
        <div className="repeatable-heading">
          <div>
            <p className="eyebrow">Optional fabric declarations</p>
            <h2>Fabric requirements</h2>
          </div>
          <button
            className="button"
            type="button"
            onClick={() =>
              setFabrics((rows) => [
                ...rows,
                {
                  key: nextKey++,
                  name: "",
                  statedRequirement: "",
                  requiredStripCount: "",
                  stripCutWidth: "",
                  allowance: "0",
                },
              ])
            }
          >
            Add fabric
          </button>
        </div>
        {fabrics.map((fabric) => (
          <div className="repeatable-row fabric-row" key={fabric.key}>
            <label>
              Fabric name
              <input name="fabricName" defaultValue={fabric.name} required />
            </label>
            <label>
              Stated yardage
              <input
                name="fabricStatedRequirement"
                defaultValue={fabric.statedRequirement}
                required
              />
            </label>
            <label>
              Required strips
              <input
                name="fabricRequiredStripCount"
                type="number"
                min="0"
                defaultValue={fabric.requiredStripCount}
              />
            </label>
            <label>
              Strip cut width
              <input
                name="fabricStripCutWidth"
                defaultValue={fabric.stripCutWidth}
              />
            </label>
            <label>
              Extra allowance
              <input name="fabricAllowance" defaultValue={fabric.allowance} />
            </label>
            <button
              className="button"
              type="button"
              onClick={() =>
                setFabrics((rows) =>
                  rows.filter((row) => row.key !== fabric.key),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </section>
      <section className="repeatable-model-section">
        <div className="repeatable-heading">
          <div>
            <p className="eyebrow">Confirmed cutting relationships</p>
            <h2>Pieces</h2>
          </div>
          <button
            className="button"
            type="button"
            onClick={() =>
              setPieces((rows) => [
                ...rows,
                {
                  key: nextKey++,
                  name: "",
                  fabric: "",
                  cutWidth: "",
                  cutHeight: "",
                  finishedWidth: "",
                  finishedHeight: "",
                  quantityPerBlock: "1",
                  statedTotal: "1",
                  subcutLength: "",
                  statedStripCount: "",
                },
              ])
            }
          >
            Add piece
          </button>
        </div>
        {pieces.map((piece) => (
          <div className="repeatable-row piece-row" key={piece.key}>
            <label>
              Piece name
              <input name="pieceName" defaultValue={piece.name} required />
            </label>
            <label>
              Fabric name
              <input name="pieceFabricName" defaultValue={piece.fabric} />
            </label>
            <label>
              Cut width
              <input
                name="pieceCutWidth"
                defaultValue={piece.cutWidth}
                required
              />
            </label>
            <label>
              Cut height
              <input
                name="pieceCutHeight"
                defaultValue={piece.cutHeight}
                required
              />
            </label>
            <label>
              Finished width
              <input
                name="pieceFinishedWidth"
                defaultValue={piece.finishedWidth}
              />
            </label>
            <label>
              Finished height
              <input
                name="pieceFinishedHeight"
                defaultValue={piece.finishedHeight}
              />
            </label>
            <label>
              Quantity per block
              <input
                name="pieceQuantityPerBlock"
                type="number"
                min="0"
                defaultValue={piece.quantityPerBlock}
                required
              />
            </label>
            <label>
              Stated total
              <input
                name="pieceStatedTotal"
                type="number"
                min="0"
                defaultValue={piece.statedTotal}
                required
              />
            </label>
            <label>
              Subcut length
              <input
                name="pieceSubcutLength"
                defaultValue={piece.subcutLength}
              />
            </label>
            <label>
              Stated strip count
              <input
                name="pieceStatedStripCount"
                type="number"
                min="0"
                defaultValue={piece.statedStripCount}
              />
            </label>
            {pieces.length > 1 && (
              <button
                className="button"
                type="button"
                onClick={() =>
                  setPieces((rows) =>
                    rows.filter((row) => row.key !== piece.key),
                  )
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </section>
      <section className="repeatable-model-section">
        <p className="eyebrow">Repeated identical block model</p>
        <h2>Block and quilt grid</h2>
        <div className="form-grid">
          <label>
            Block name
            <input name="blockName" defaultValue="Primary block" required />
          </label>
          <label>
            Finished block width
            <input
              name="finishedWidth"
              defaultValue={initialFinishedWidth}
              required
            />
          </label>
          <label>
            Finished block height
            <input
              name="finishedHeight"
              defaultValue={initialFinishedHeight}
              required
            />
          </label>
          <label>
            Block quantity
            <input
              name="blockQuantity"
              type="number"
              min="1"
              defaultValue={initialBlockQuantity}
              required
            />
          </label>
          <label>
            Stated quilt width
            <input name="statedQuiltWidth" defaultValue={initialQuiltWidth} />
          </label>
          <label>
            Stated quilt height
            <input name="statedQuiltHeight" defaultValue={initialQuiltHeight} />
          </label>
        </div>
      </section>
    </>
  );
}
