from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models import Tag, User


def test_tag_create_and_list_endpoints_are_scoped_to_current_user(
    app: FastAPI,
    auth_headers: dict[str, str],
    current_user_id: UUID,
    testing_session: sessionmaker[Session],
) -> None:
    with testing_session() as session:
        current_tag = Tag(user_id=current_user_id, name="Dinner")
        other_user = User(
            email="other@example.com",
            password_hash="other-password-hash",
            tags=[Tag(name="Quick")],
        )
        session.add_all([current_tag, other_user])
        session.commit()

    with TestClient(app) as client:
        create_response = client.post(
            "/api/v1/tags",
            headers=auth_headers,
            json={"name": "Quick"},
        )
        duplicate_response = client.post(
            "/api/v1/tags",
            headers=auth_headers,
            json={"name": "Dinner"},
        )
        list_response = client.get(
            "/api/v1/tags",
            headers=auth_headers,
        )

    assert create_response.status_code == 201
    assert create_response.json()["name"] == "Quick"
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Tag already exists."}
    assert list_response.status_code == 200
    assert [item["name"] for item in list_response.json()["items"]] == [
        "Dinner",
        "Quick",
    ]

    with testing_session() as session:
        tags = list(
            session.scalars(select(Tag).join(User).where(User.email == "current@example.com"))
        )
        assert {tag.name for tag in tags} == {"Dinner", "Quick"}
