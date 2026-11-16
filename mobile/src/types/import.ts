import type { RecipeDetailResponse } from "./recipe";

export type RecipeImportDraft = Omit<RecipeDetailResponse, "id">;

export type RecipeImportPreviewRequest = {
  url: string;
  import_as_copy?: boolean;
};

export type RecipeImportStatus = "success" | "partial" | "failed" | "blocked" | "duplicate";

export type RecipeImportNextAction = "open_existing" | "import_as_copy" | "enter_manually" | "open_source_url";

export type RecipeImportPreviewResponse = {
  import_id: string;
  status: RecipeImportStatus;
  parser_used: string | null;
  draft: RecipeImportDraft | null;
  warnings: string[];
  existing_recipe_id: string | null;
  next_actions: RecipeImportNextAction[];
};
