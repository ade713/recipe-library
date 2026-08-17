from sqlalchemy import create_engine, inspect

from app.models import Base


def test_model_metadata_creates_all_core_tables() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")

    Base.metadata.create_all(engine)

    table_names = set(inspect(engine).get_table_names())
    assert table_names == {
        "recipe_imports",
        "recipe_ingredients",
        "recipe_notes",
        "recipe_steps",
        "recipe_tags",
        "recipe_tips",
        "recipes",
        "tags",
        "users",
    }


def test_recipe_table_preserves_source_attribution() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    recipe_columns = {
        column["name"] for column in inspect(engine).get_columns("recipes")
    }

    assert {
        "source_url",
        "source_domain",
        "source_site_name",
        "source_author",
    }.issubset(recipe_columns)


def test_recipe_requires_an_owner_and_title() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    recipe_columns = {
        column["name"]: column for column in inspect(engine).get_columns("recipes")
    }

    assert recipe_columns["user_id"]["nullable"] is False
    assert recipe_columns["title"]["nullable"] is False


def test_recipe_owner_references_users_table() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    recipe_foreign_keys = inspect(engine).get_foreign_keys("recipes")

    assert any(
        foreign_key["constrained_columns"] == ["user_id"]
        and foreign_key["referred_table"] == "users"
        and foreign_key["referred_columns"] == ["id"]
        for foreign_key in recipe_foreign_keys
    )


def test_tag_names_are_unique_per_user() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)

    tag_constraints = inspect(engine).get_unique_constraints("tags")

    assert any(
        constraint["column_names"] == ["user_id", "name"]
        for constraint in tag_constraints
    )
