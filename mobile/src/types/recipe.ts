export type IngredientDraft = {
  position: number;
  originalText: string;
  quantity?: number | null;
  quantityText?: string | null;
  unit?: string | null;
  name?: string | null;
  preparationNote?: string | null;
  isOptional: boolean;
  scaleLocked: boolean;
  parseStatus: "parsed" | "partial" | "unparsed";
};

export type RecipeStepDraft = {
  position: number;
  instruction: string;
  sectionTitle?: string | null;
};

export type RecipeDraft = {
  title: string;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  totalTimeMinutes?: number | null;
  baseServings?: number | null;
  servingsUnit?: string | null;
  ingredients: IngredientDraft[];
  steps: RecipeStepDraft[];
  tips: string[];
  tags: string[];
};

export type RecipeSummary = {
  id: string;
  title: string;
  image_url: string | null;
  total_time_minutes: number | null;
  base_servings: string | null;
  is_favorite: boolean;
  tags: string[];
};

export type RecipeListResponse = {
  items: RecipeSummary[];
};
