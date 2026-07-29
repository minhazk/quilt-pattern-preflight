import type { Finding } from "@preflight/contracts";

export function FindingCard({
  finding,
  index,
}: {
  finding: Finding;
  index: number;
}) {
  return (
    <article className="finding-card" id={`finding-${index + 1}`}>
      <div className="finding-head">
        <span className={`severity severity-${finding.severity}`}>
          {finding.severity}
        </span>
        <span>
          {finding.ruleId} · v{finding.ruleVersion}
        </span>
      </div>
      <h2>{finding.title}</h2>
      <p className="finding-explanation">{finding.explanation}</p>
      <div className="finding-math">
        <div>
          <span>Formula</span>
          <code>{finding.formula}</code>
        </div>
        {Object.entries(finding.operands).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div>
          <span>Expected</span>
          <strong>{finding.expectedResult}</strong>
        </div>
        <div>
          <span>Stated</span>
          <strong>{finding.statedResult}</strong>
        </div>
        <div className="finding-difference">
          <span>Difference</span>
          <strong>{finding.difference}</strong>
        </div>
      </div>
      <div className="finding-columns">
        <div>
          <h3>Source evidence</h3>
          {finding.sources.map((source) => (
            <blockquote key={`${source.page}-${source.excerpt}`}>
              <span>
                {source.page ? `Page ${source.page}` : source.section}
                {source.page && source.section ? ` · ${source.section}` : ""}
              </span>
              “{source.excerpt}”
            </blockquote>
          ))}
        </div>
        <div>
          <h3>Assumptions used</h3>
          <ul>
            {finding.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
          <h3>Recommended action</h3>
          <p>{finding.recommendedAction}</p>
        </div>
      </div>
      <footer>
        <span>Confidence {Math.round(finding.confidence * 100)}%</span>
        <span>Operator reviewed</span>
      </footer>
    </article>
  );
}
