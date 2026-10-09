import { useEffect, useRef, useState } from "react";
import { Download, Play, RotateCcw } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../app/auth-context";
import type { RunOutputs, PreviewAccess } from "../../../shared/preview";
async function outputResponse(path: string, method = "GET") {
  const response = await fetch(path, { method, credentials: "same-origin" });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("nexyral:session-expired"));
    throw new Error(response.status === 401 ? "Sign in again to access this output." : "This output is unavailable or does not match its recorded evidence.");
  }
  return response;
}
export default function RunOutput({ runId, outputs }: { runId: string; outputs?: RunOutputs }) {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!url || !open) return;
    const timer = setTimeout(() => { setLoading(false); setError("The preview service did not respond. Reset the preview to retry."); }, 10000);
    const ready = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== "null" || !event.data || typeof event.data !== "object" || !("type" in event.data) || event.data.type !== "nexyral.preview.ready") return;
      clearTimeout(timer); setLoading(false); setError(null);
    };
    window.addEventListener("message", ready);
    return () => { clearTimeout(timer); window.removeEventListener("message", ready); };
  }, [url, open]);
  async function preview(reset = false) {
    if (open && !reset) { setOpen(false); return; }
    setPending(true); setError(null);
    try {
      const access = await api<PreviewAccess>(`/runs/${runId}/preview-access`, { method: "POST", body: {}, csrf: auth.csrfToken });
      setLoading(true); setUrl(access.url); setOpen(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to open preview."); }
    finally { setPending(false); }
  }
  async function download() {
    setPending(true); setError(null);
    try {
      const response = await outputResponse(`/api/runs/${runId}/source`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `nexyral-${runId}.tar`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to export source."); }
    finally { setPending(false); }
  }
  if (!outputs?.sourceAvailable) return null;
  return <section className="run-output" aria-labelledby="run-output-title">
    <div className="evidence-heading"><div><span className="eyebrow">RUN OUTPUT / RETAINED</span><h2 id="run-output-title">Inspect what was built.</h2></div>
      <button className="button button-secondary" disabled={pending} onClick={() => void download()}><Download size={14} />Download source archive</button>
    </div>
    <p>The archive includes the stored source, approved scope, and measured verification evidence. The preview uses the retained production bundle; opening it does not rebuild or deploy anything.</p>
    {outputs.previewExpiresAt && <p className="technical">Preview retention ends {new Date(outputs.previewExpiresAt).toLocaleString()}. Source and evidence remain available.</p>}
    {outputs.previewAvailable ? <>
      <div className="plan-editor-actions"><button className="button" disabled={pending} onClick={() => void preview()} aria-expanded={open}><Play size={14} />{open ? "Close preview" : "Open verified preview"}</button>
        {open && <button className="button button-secondary" disabled={pending} onClick={() => void preview(true)}><RotateCcw size={14} />Reset preview</button>}
      </div>
      {open && <div className="preview-frame"><div className="preview-frame-bar"><span className="technical">ISOLATED FRONTEND / LOCAL STATE</span><span role="status">{loading ? "Loading preview…" : "Preview frame ready"}</span></div>
        <iframe ref={frame} key={url} title="Generated frontend preview" src={url ?? undefined} sandbox="allow-scripts" referrerPolicy="no-referrer" />
      </div>}
    </> : <p className="technical">{outputs.previewUnavailableReason === "expired" ? "This preview expired. Source and verification evidence remain available." : outputs.previewUnavailableReason === "quota" ? "Preview storage quota reached. Source and verification evidence were retained." : "No retained verified preview is available. Review the source and evidence."}</p>}
    {pending && <p role="status">Preparing run output…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
