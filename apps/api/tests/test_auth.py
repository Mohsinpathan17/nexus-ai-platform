from auth_service import get_password_hash, verify_password


def test_password_hashing_and_verification_work():
    password = "secret123"
    hashed = get_password_hash(password)

    assert hashed.startswith("$2")
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False
