import threading, uuid
from datetime import datetime, timezone

def now(): return datetime.now(timezone.utc).isoformat()

class MissionStore:
    def __init__(self):
        self.runs={}; self.events={}; self.evidence_items={}; self.lock=threading.Lock()
    def create_run(self, task):
        run_id=f"NX-{uuid.uuid4().hex[:8].upper()}"
        run={"id":run_id,"task":task,"status":"queued","phase":"Initializing","progress":0,"confidence":0,"risk":"LOW","risk_score":12,"created_at":now(),"updated_at":now(),"root_cause":None,"diff":None,"changed_files":[],"tests":[],"security":[],"approval_required":False,"pr":None}
        with self.lock:
            self.runs[run_id]=run; self.events[run_id]=[]; self.evidence_items[run_id]=[]
        return run
    def get(self, run_id): return self.runs.get(run_id)
    def update(self, run_id, **values):
        with self.lock: self.runs[run_id].update(values, updated_at=now()); return self.runs[run_id]
    def add_event(self, run_id, agent, action, detail, state="running", risk="LOW"):
        e={"id":uuid.uuid4().hex[:10],"timestamp":now(),"agent":agent,"action":action,"detail":detail,"state":state,"risk":risk}
        with self.lock: self.events[run_id].append(e)
        return e
    def add_evidence(self, run_id, kind, title, detail, source, confidence):
        e={"id":uuid.uuid4().hex[:10],"kind":kind,"title":title,"detail":detail,"source":source,"confidence":confidence}
        with self.lock: self.evidence_items[run_id].append(e)
        return e
    def timeline(self, run_id): return self.events.get(run_id,[])
    def evidence(self, run_id): return self.evidence_items.get(run_id,[])
    def metrics(self):
        runs=list(self.runs.values()); completed=sum(x["status"]=="completed" for x in runs)
        return {"missions":len(runs),"completed":completed,"success_rate":round(completed/len(runs)*100,1) if runs else 0,"tool_calls":sum(len(self.events[x["id"]]) for x in runs),"avg_confidence":round(sum(x["confidence"] for x in runs)/len(runs),1) if runs else 0}
