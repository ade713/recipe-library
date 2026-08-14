import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_scale_preview_returns_a_scaled_ingredient() -> None:
    response = client.post(
        "/api/v1/ingredients/scale-preview",
        json={
            "line": "1/2 tsp salt",
            "multiplier": 2,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "original_line": "1/2 tsp salt",
        "scaled_line": "1 tsp salt",
        "multiplier": 2,
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"line": "", "multiplier": 2},
        {"line": "2 cups flour", "multiplier": 4},
        {"multiplier": 2},
    ],
)
def test_scale_preview_returns_422_for_invalid_request_data(
    payload: dict[str, object],
) -> None:
    response = client.post("/api/v1/ingredients/scale-preview", json=payload)

    assert response.status_code == 422
