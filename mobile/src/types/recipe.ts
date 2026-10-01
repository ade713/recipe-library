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

export type RecipeDetailResponse = RecipeSummary & {
  description: string | null;
  source_url: string | null;
  source_domain: string | null;
  source_site_name: string | null;
  source_author: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings_unit: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips: RecipeTip[];
};

export type RecipeIngredient = {
  position: number;
  original_text: string;
  quantity: string | null;
  quantity_text: string | null;
  unit: string | null;
  name: string | null;
  preparation_note: string | null;
  is_optional: boolean;
  scale_locked: boolean;
  parse_status: string;
};

export type RecipeStep = {
  position: number;
  instruction: string;
  section_title: string | null;
};

export type RecipeTip = {
  position: number;
  tip: string;
};
