from .policy import PolicyEngine

class ToolLayer:
    """Controlled engineering tools backed by deterministic demo fixtures."""
    def __init__(self): self.policy=PolicyEngine()
    def call(self, action, payload=None):
        decision=self.policy.evaluate(action)
        if decision["decision"] in {"BLOCK","REVIEW"}:
            return {"ok":False,"policy":decision,"payload":payload}
        fixtures={
            "repo_read":{"files":["checkout/routes.py","checkout/payment.py","tests/test_checkout.py"],"commit":"8c41f2a"},
            "logs_read":{"lines":["POST /checkout 500","PaymentError: status='pending' has no amount","checkout.payment.process_payment -> line 42"]},
            "db_read":{"rows":[{"order_id":"ORD-20481","payment_status":"pending","amount":1299}]},
            "tests_run":{"passed":18,"failed":0,"duration_ms":842},
            "security_scan":{"critical":0,"high":0,"medium":1,"finding":"demo dependency warning"},
            "sandbox_write":{"written":["checkout/payment.py"]}}
        return {"ok":True,"policy":decision,"data":fixtures.get(action,{})}
