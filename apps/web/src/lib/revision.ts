export type ComparableFinding = {
  id: string;
  rule_id: string;
  category: string;
  title: string;
  operands: Record<string, string>;
};

export type RevisionComparison = {
  resolved: string[];
  remaining: string[];
  new: string[];
};

function findingFingerprint(finding: ComparableFinding): string {
  const operands = Object.entries(finding.operands)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
  return [finding.rule_id, finding.category, finding.title, operands].join("::");
}

export function compareFindings(
  previous: ComparableFinding[],
  current: ComparableFinding[],
): RevisionComparison {
  const previousByFingerprint = new Map(
    previous.map((finding) => [findingFingerprint(finding), finding.id]),
  );
  const currentByFingerprint = new Map(
    current.map((finding) => [findingFingerprint(finding), finding.id]),
  );

  return {
    resolved: previous
      .filter(
        (finding) => !currentByFingerprint.has(findingFingerprint(finding)),
      )
      .map((finding) => finding.id),
    remaining: current
      .filter((finding) =>
        previousByFingerprint.has(findingFingerprint(finding)),
      )
      .map((finding) => finding.id),
    new: current
      .filter(
        (finding) => !previousByFingerprint.has(findingFingerprint(finding)),
      )
      .map((finding) => finding.id),
  };
}
