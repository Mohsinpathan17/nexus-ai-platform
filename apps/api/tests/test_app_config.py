from main import build_allowed_origins


def test_default_allowed_origins_include_local_frontend():
    assert build_allowed_origins() == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_allowed_origins_parse_csv_string():
    assert build_allowed_origins("https://app.example.com, https://admin.example.com ") == [
        "https://app.example.com",
        "https://admin.example.com",
    ]
