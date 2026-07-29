"use client";

import { useState } from "react";
import { createProjectUpload } from "@/app/actions/projects";

const steps = ["Project", "Document", "Assumptions", "Upload"];

export function NewProjectForm() {
  const [step, setStep] = useState(0);

  return (
    <main className="workspace wizard-page">
      <div className="workspace-heading compact">
        <div>
          <p className="eyebrow">New preflight</p>
          <h1>{steps[step]}</h1>
        </div>
        <span>
          Step {step + 1} of {steps.length}
        </span>
      </div>
      <ol className="stepper four-steps" aria-label="Project progress">
        {steps.map((label, index) => (
          <li
            key={label}
            className={index <= step ? "active" : ""}
            aria-current={index === step ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <form action={createProjectUpload} className="wizard-card">
        <section hidden={step !== 0}>
          <p className="eyebrow">Name the work</p>
          <h2>Create a private project</h2>
          <label htmlFor="title">Pattern title</label>
          <input id="title" name="title" placeholder="Meadow Lines Throw" required />
          <label htmlFor="source">How did you hear about the pilot?</label>
          <select id="source" name="source" defaultValue="direct_email">
            <option value="direct_email">Direct email</option>
            <option value="instagram">Instagram</option>
            <option value="facebook_group">Facebook group</option>
            <option value="reddit">Reddit</option>
            <option value="designer_directory">Designer directory</option>
            <option value="technical_editor_referral">
              Technical-editor referral
            </option>
            <option value="other">Other</option>
          </select>
        </section>
        <section hidden={step !== 1}>
          <p className="eyebrow">Private upload</p>
          <h2>Add a completed pattern document</h2>
          <label className="upload-zone" htmlFor="pattern-file">
            <strong>Choose a DOCX or text-layer PDF</strong>
            <span>English-language files up to 15 MB</span>
            <input
              id="pattern-file"
              name="patternFile"
              type="file"
              accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              required
            />
          </label>
          <p className="form-note">
            Scanned and image-only PDFs are rejected before a credit is
            consumed.
          </p>
        </section>
        <section hidden={step !== 2}>
          <p className="eyebrow">Confirmed inputs</p>
          <h2>Tell us what the document means</h2>
          <div className="form-grid">
            <label>
              Seam allowance
              <input name="seamAllowance" defaultValue="1/4" required />
            </label>
            <label>
              Usable WOF
              <input name="usableWof" defaultValue="40" required />
            </label>
            <label>
              Fabric rounding
              <select name="rounding" defaultValue="1/8">
                <option>1/8</option>
                <option>1/4</option>
                <option>1/2</option>
              </select>
            </label>
            <label>
              Measurements
              <select name="measurementState" defaultValue="mixed">
                <option value="finished">Finished</option>
                <option value="unfinished">Unfinished</option>
                <option value="mixed">Mixed / individually labelled</option>
              </select>
            </label>
            <label>
              Block rows
              <input name="blockRows" defaultValue="1" type="number" min="1" required />
            </label>
            <label>
              Block columns
              <input name="blockColumns" defaultValue="1" type="number" min="1" required />
            </label>
          </div>
          <fieldset>
            <legend>Construction declarations</legend>
            <label>
              <input
                name="constructionFlags"
                value="excluded_construction_present"
                type="checkbox"
              />
              Includes curves, appliqué, templates or another excluded method
            </label>
            <label>
              <input name="completeTables" type="checkbox" defaultChecked />
              Document contains all fabric and cutting tables
            </label>
            <label>
              <input name="extraPiecesDeliberate" type="checkbox" />
              Extra pieces are deliberate
            </label>
            <label>
              <input name="wasteIncluded" type="checkbox" />
              Stated requirements already include waste
            </label>
            <label>
              <input name="stripPiecing" type="checkbox" />
              Uses straight strip piecing
            </label>
            <label>
              <input name="sashingUsed" type="checkbox" />
              Uses straight sashing
            </label>
            <label>
              <input name="bordersUsed" type="checkbox" />
              Uses straight borders
            </label>
          </fieldset>
        </section>
        <section hidden={step !== 3}>
          <p className="eyebrow">Extraction checkpoint</p>
          <h2>Upload and extract proposed values</h2>
          <p>
            The original file is stored privately. Extraction validates the
            document structure and creates source-linked proposed values for
            you to confirm. Your credit is not consumed yet.
          </p>
          <div className="submit-summary">
            <div>
              <span>Accepted formats</span>
              <strong>DOCX or text-layer PDF</strong>
            </div>
            <div>
              <span>Maximum size</span>
              <strong>15 MB</strong>
            </div>
            <div>
              <span>Next step</span>
              <strong>Confirm extracted model</strong>
            </div>
          </div>
        </section>
        <div className="wizard-actions">
          <button
            className="button"
            type="button"
            disabled={step === 0}
            onClick={() => setStep((value) => value - 1)}
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setStep((value) => value + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="button button-primary" type="submit">
              Securely upload and extract
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
