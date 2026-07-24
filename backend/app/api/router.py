from fastapi import APIRouter

from app.api.routes import auth, health, imports, notes, recipes, tags

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(imports.router, prefix="/imports", tags=["imports"])
api_router.include_router(recipes.router, prefix="/recipes", tags=["recipes"])
api_router.include_router(notes.router, prefix="/recipes/{recipe_id}/notes", tags=["notes"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
