"use client";

import { useState } from "react";

const steps = ["Project", "Document", "Assumptions", "Confirm", "Submit"];

export default function NewProjectPage() {
  const [step, setStep] = useState(0);

  return (
    <main className="workspace wizard-page">
      <div className="workspace-heading compact">
        <div>
          <p className="eyebrow">New preflight</p>
          <h1>{steps[step]}</h1>
        </div>
        <span>Step {step + 1} of {steps.length}</span>
      </div>
      <ol className="stepper" aria-label="Project progress">
        {steps.map((label, index) => (
          <li key={label} className={index <= step ? "active" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index + 1}</span>{label}
          </li>
        ))}
      </ol>
      <section className="wizard-card">
        {step === 0 && (
          <>
            <p className="eyebrow">Name the work</p>
            <h2>Create a private project</h2>
            <label htmlFor="title">Pattern title</label>
            <input id="title" defaultValue="Meadow Lines Throw" />
            <label htmlFor="source">How did you hear about the pilot?</label>
            <select id="source" defaultValue="direct_email">
              <option value="direct_email">Direct email</option>
              <option value="instagram">Instagram</option>
              <option value="facebook_group">Facebook group</option>
              <option value="reddit">Reddit</option>
              <option value="designer_directory">Designer directory</option>
              <option value="technical_editor_referral">Technical-editor referral</option>
              <option value="other">Other</option>
            </select>
          </>
        )}
        {step === 1 && (
          <>
            <p className="eyebrow">Private upload</p>
            <h2>Add a completed pattern document</h2>
            <label className="upload-zone" htmlFor="pattern-file">
              <strong>Choose a DOCX or text-layer PDF</strong>
              <span>English-language files up to 15 MB</span>
              <input id="pattern-file" type="file" accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" />
            </label>
            <p className="form-note">Scanned and image-only PDFs will be rejected before a credit is consumed.</p>
          </>
        )}
        {step === 2 && (
          <>
            <p className="eyebrow">Confirmed inputs</p>
            <h2>Tell us what the document means</h2>
            <div className="form-grid">
              <label>Seam allowance<input defaultValue="1/4" inputMode="text" /></label>
              <label>Usable WOF<input defaultValue="40" inputMode="decimal" /></label>
              <label>Fabric rounding<select defaultValue="1/8"><option>1/8</option><option>1/4</option><option>1/2</option></select></label>
              <label>Measurements<select defaultValue="mixed"><option value="finished">Finished</option><option value="unfinished">Unfinished</option><option value="mixed">Mixed / labelled individually</option></select></label>
              <label>Block rows<input defaultValue="1" type="number" min="1" /></label>
              <label>Block columns<input defaultValue="5" type="number" min="1" /></label>
            </div>
            <fieldset>
              <legend>Construction declarations</legend>
              <label><input type="checkbox" /> Includes curves, appliqué, templates or another excluded method</label>
              <label><input type="checkbox" defaultChecked /> Uploaded document contains all fabric and cutting tables</label>
              <label><input type="checkbox" /> Extra pieces are deliberate</label>
            </fieldset>
          </>
        )}
        {step === 3 && (
          <>
            <p className="eyebrow">Customer confirmation</p>
            <h2>Review extracted values</h2>
            <p>This step is populated after the extraction service processes a real upload. The local sample shows the editable evidence model.</p>
            <div className="entity-table" role="table" aria-label="Extracted pieces">
              <div role="row"><strong role="columnheader">Piece</strong><strong role="columnheader">Cut size</strong><strong role="columnheader">Quantity</strong><strong role="columnheader">Source</strong></div>
              <div role="row"><input aria-label="Piece name" defaultValue="Background rectangle" /><input aria-label="Cut size" defaultValue="2 1/2 × 4 1/2" /><input aria-label="Quantity" type="number" defaultValue="32" /><span>Page 3</span></div>
              <div role="row"><input aria-label="Piece name" defaultValue="Accent strip" /><input aria-label="Cut size" defaultValue="4 1/4 × WOF" /><input aria-label="Quantity" type="number" defaultValue="10" /><span>Page 4</span></div>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <p className="eyebrow">Ready for preflight</p>
            <h2>Submit the confirmed model</h2>
            <div className="submit-summary">
              <div><span>Document</span><strong>Meadow-Lines-v1.docx</strong></div>
              <div><span>Confirmed entities</span><strong>12</strong></div>
              <div><span>Credit after submission</span><strong>0 remaining</strong></div>
            </div>
            <p>Automated arithmetic checks run first. Your project then enters the beta operator-review queue. A report is not released without quality-control approval.</p>
          </>
        )}
        <div className="wizard-actions">
          <button className="button" type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>Back</button>
          {step < steps.length - 1 ? (
            <button className="button button-primary" type="button" onClick={() => setStep((value) => value + 1)}>Continue</button>
          ) : (
            <button className="button button-primary" type="button">Submit for preflight</button>
          )}
        </div>
      </section>
    </main>
  );
}
