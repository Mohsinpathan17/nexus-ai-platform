class PolicyEngine:
    SAFE={"repo_read","logs_read","db_read","tests_run","security_scan","sandbox_write"}
    REVIEW={"create_pr","deploy_staging","production_config"}
    BLOCK={"delete_database","drop_table","exfiltrate_secrets","production_shell"}
    APPROVAL={"deploy_production"}
    def evaluate(self, action):
        if action in self.BLOCK:
            return {"decision":"BLOCK","reason":"Destructive or unsafe action is not permitted."}
        if action in self.APPROVAL:
            return {"decision":"REVIEW","reason":"Production deployment requires human approval."}
        if action in self.REVIEW:
            return {"decision":"ALLOW_LOGGED","reason":"Allowed with an audit record."}
        if action in self.SAFE:
            return {"decision":"ALLOW","reason":"Action is inside the sandbox/read-only policy."}
        return {"decision":"REVIEW","reason":"Unknown tool action requires review."}
