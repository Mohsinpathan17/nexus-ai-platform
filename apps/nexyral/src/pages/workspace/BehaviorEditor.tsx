import type { BehaviorCheck, BehaviorStep } from "../../../shared/behavior";
export default function BehaviorEditor({ checks, onChange }: { checks: BehaviorCheck[]; onChange: (checks: BehaviorCheck[]) => void }) {
  const update = (index: number, check: BehaviorCheck) => onChange(checks.map((item, i) => i === index ? check : item));
  return <fieldset className="behavior-editor"><legend>Browser behavior checks</legend>
    <p>Optional checks run after compilation. Target buttons and labeled text inputs by their exact accessible name. Each check starts in a fresh browser context and must include a visible-text assertion.</p>
    {checks.map((check, index) => <fieldset key={index}><legend>Check {index + 1}</legend>
      <label>Check name<input value={check.name} maxLength={100} onChange={(event) => update(index, { ...check, name: event.target.value })} /></label>
      {check.steps.map((step, i) => <div className="behavior-step" key={i}>
        <label>Action<select value={step.action} onChange={(event) => {
          const action = event.target.value as BehaviorStep["action"];
          update(index, { ...check, steps: check.steps.map((item, j) => j === i ? action === "fill" ? { action, text: item.text, value: "" } : { action, text: item.text } : item) });
        }}><option value="expectText">Expect visible text</option><option value="click">Click button</option><option value="fill">Fill text input</option></select></label>
        <label>{step.action === "expectText" ? "Expected text" : "Accessible name"}<input value={step.text} maxLength={200} onChange={(event) => update(index, { ...check, steps: check.steps.map((item, j) => j === i ? { ...item, text: event.target.value } : item) })} /></label>
        {step.action === "fill" && <label>Input value<input value={step.value} maxLength={500} onChange={(event) => update(index, { ...check, steps: check.steps.map((item, j) => j === i ? { ...step, value: event.target.value } : item) })} /></label>}
        <button type="button" className="button button-secondary" onClick={() => update(index, { ...check, steps: check.steps.filter((_, j) => j !== i) })}>Remove step {i + 1}</button>
      </div>)}
      <div className="plan-editor-actions"><button type="button" className="button button-secondary" disabled={check.steps.length >= 12} onClick={() => update(index, { ...check, steps: [...check.steps, { action: "expectText", text: "" }] })}>Add step</button>
      <button type="button" className="button button-secondary" onClick={() => onChange(checks.filter((_, i) => i !== index))}>Remove check {index + 1}</button></div>
    </fieldset>)}
    <button type="button" className="button button-secondary" disabled={checks.length >= 8} onClick={() => onChange([...checks, { name: "", steps: [{ action: "expectText", text: "" }] }])}>Add behavior check</button>
  </fieldset>;
}
