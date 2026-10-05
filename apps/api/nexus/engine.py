import asyncio
from .store import MissionStore
from .tools import ToolLayer

class NexusEngine:
    def __init__(self, store): self.store=store; self.tools=ToolLayer()
    async def step(self, run_id, phase, progress, agent, action, detail, delay=.55, risk="LOW"):
        self.store.update(run_id, phase=phase, progress=progress)
        self.store.add_event(run_id,agent,action,detail,risk=risk)
        await asyncio.sleep(delay)
    async def execute(self, run_id):
        if not self.store.get(run_id): return
        try:
            await self.step(run_id,"Planning",8,"ORCHESTRATOR","PLAN","Mission decomposed into evidence collection, repair, validation and release safety.")
            await self.step(run_id,"Repository scan",18,"INVESTIGATOR","REPO_READ","Inspecting checkout routes, payment service and recent deployment diff.")
            self.tools.call("repo_read")
            self.store.add_evidence(run_id,"CODE","Payment processing path","checkout/payment.py contains the payment status branch used by checkout.","checkout/payment.py",.96)
            await self.step(run_id,"Log correlation",30,"INVESTIGATOR","LOGS_READ","Correlating HTTP 500 with the payment exception.")
            self.tools.call("logs_read")
            self.store.add_evidence(run_id,"LOG","HTTP 500 signature","PaymentError occurs while processing an order whose payment status is pending.","production.log:42",.99)
            await self.step(run_id,"Database evidence",42,"DATABASE","DB_READ","Checking the affected order state in read-only mode.")
            self.tools.call("db_read")
            self.store.add_evidence(run_id,"DATABASE","Affected order state","ORD-20481 has payment_status=pending and a valid amount.","orders table",.97)
            self.store.update(run_id,root_cause="Checkout assumes a non-pending payment state before reading the amount. The deployment introduced an invalid state transition path.",confidence=96)
            await self.step(run_id,"Root cause found",52,"INVESTIGATOR","HYPOTHESIS","Evidence converges on a stale payment-status assumption in payment processing.",.75)
            await self.step(run_id,"Patch generation",64,"ENGINEER","SANDBOX_WRITE","Generating a minimal defensive patch in the isolated workspace.")
            patch='''--- a/checkout/payment.py\n+++ b/checkout/payment.py\n@@\n-    if payment.status != "paid":\n-        raise PaymentError("Payment not completed")\n+    if payment.status == "failed":\n+        raise PaymentError("Payment failed")\n+    if payment.status in {"pending", "paid"} and payment.amount > 0:\n+        return payment.amount\n'''
            self.store.update(run_id,diff=patch,changed_files=["checkout/payment.py"])
            self.store.add_evidence(run_id,"PATCH","Minimal repair","Only the payment-state guard is changed; no API contract is modified.","sandbox diff",.94)
            await self.step(run_id,"Regression tests",76,"TESTER","TESTS_RUN","Running unit and integration tests against the patched sandbox.")
            self.tools.call("tests_run")
            self.store.update(run_id,tests=[{"name":"checkout success","status":"PASS"},{"name":"pending payment","status":"PASS"},{"name":"failed payment","status":"PASS"},{"name":"checkout API integration","status":"PASS"}])
            await self.step(run_id,"Security review",84,"SECURITY","SECURITY_SCAN","Scanning changed files and dependency surface.")
            self.tools.call("security_scan")
            self.store.update(run_id,security=[{"severity":"HIGH","count":0},{"severity":"CRITICAL","count":0},{"severity":"MEDIUM","count":1}])
            await self.step(run_id,"Evaluation",91,"EVALUATOR","EVALUATE","Checking task success, regression risk and policy compliance.")
            self.store.add_evidence(run_id,"EVALUATION","Evaluator verdict","Patch passes tests and introduces no critical/high security findings.","evaluation engine",.95)
            self.store.update(run_id,status="awaiting_approval",phase="Human approval",progress=96,approval_required=True,risk="MEDIUM",risk_score=43,pr={"title":"fix: handle pending payment state in checkout","branch":"nexus/fix-checkout-20481","status":"ready_for_review"})
            self.store.add_event(run_id,"POLICY","PRODUCTION_GATE","PR is ready. Production deployment is blocked until a human approves.",state="awaiting_approval",risk="MEDIUM")
        except Exception as exc:
            self.store.update(run_id,status="failed",phase="Failure",progress=100)
            self.store.add_event(run_id,"ORCHESTRATOR","FAILURE",str(exc),state="failed",risk="HIGH")
    def approve(self, run_id, note=""):
        run=self.store.get(run_id)
        if not run: return {"error":"Mission not found"}
        if run["status"]!="awaiting_approval": return {"error":"No approval is currently required"}
        self.store.update(run_id,status="completed",phase="Completed",progress=100,approval_required=False)
        self.store.add_event(run_id,"HUMAN GATE","APPROVED",note or "Human approved the release gate. Demo deployment may proceed.",state="completed",risk="MEDIUM")
        self.store.add_event(run_id,"DEPLOYMENT","STAGING_DEPLOY","Deployment simulation completed successfully; production remains explicitly gated.",state="completed",risk="MEDIUM")
        return self.store.get(run_id)
    def reject(self, run_id, note=""):
        run=self.store.get(run_id)
        if not run: return {"error":"Mission not found"}
        self.store.update(run_id,status="rejected",phase="Rejected",approval_required=False,progress=100)
        self.store.add_event(run_id,"HUMAN GATE","REJECTED",note or "Human rejected the proposed release.",state="rejected",risk="MEDIUM")
        return self.store.get(run_id)
