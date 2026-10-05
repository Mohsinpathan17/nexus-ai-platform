from nexus.policy import PolicyEngine
def test_safe_read(): assert PolicyEngine().evaluate("repo_read")["decision"]=="ALLOW"
def test_destructive_action_blocked(): assert PolicyEngine().evaluate("delete_database")["decision"]=="BLOCK"
def test_production_requires_review(): assert PolicyEngine().evaluate("deploy_production")["decision"]=="REVIEW"
