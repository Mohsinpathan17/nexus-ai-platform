import type { Artifact } from "../../../shared/contracts";
import { summarizeEvidence } from "../../../shared/run-evidence";
export default function BehaviorEvidence({ artifact }: { artifact?: Artifact }) {
  if (!artifact) return null;
  const report = summarizeEvidence([artifact]).behavior;
  if (!report) return null;
  return <section className="plan-review" aria-labelledby="behavior-evidence-title"><span className="eyebrow">MEASURED / BROWSER BEHAVIOR</span>
    <h2 id="behavior-evidence-title">{report.status === "passed" ? "Selected checks passed." : report.status === "failed" ? "Behavior checks failed." : "Behavior checks did not run."}</h2>
    {report.reason && <p>{report.reason}</p>}
    <ul>{report.results.map((result, i) => <li key={i}><strong>{result.name}: {result.passed ? "Passed" : "Failed"}</strong>{result.error && <pre>{result.error}</pre>}</li>)}</ul>
    <p>These results cover the selected interactions only. They do not establish security, accessibility, performance, or deployment readiness.</p>
  </section>;
}
