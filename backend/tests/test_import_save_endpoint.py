from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def test_save_import_endpoint_requires_authentication() -> None:
    app = create_app()
    import_id = uuid4()

    with TestClient(app) as client:
        response = client.post(
            f"/api/v1/imports/{import_id}/save",
            json={"title": "Edited Tomato Soup"},
        )

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
