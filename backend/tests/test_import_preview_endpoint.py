from fastapi.testclient import TestClient

from app.main import create_app


def test_import_preview_endpoint_requires_authentication() -> None:
    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/imports/preview",
            json={"url": "https://example.com/recipe"},
        )

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
