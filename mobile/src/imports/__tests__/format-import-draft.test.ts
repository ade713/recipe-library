import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeEditFormValues } from "@/recipes/recipe-edit-form";
import type { RecipeImportDraft } from "@/types/import";

import { formatImportDraft } from "../format-import-draft";

const BOWLS_UNIT = "bowls";
const REVIEWED_TITLE = "Reviewed soup";
const SOURCE_AUTHOR = "Recipe author";
const SOURCE_DOMAIN = "example.com";
const SOURCE_SITE_NAME = "Example Kitchen";
const SOURCE_URL = "https://example.com/soup";
const TAG = "Dinner";

const makeDraft = (): RecipeImportDraft => {
  const { id, ...draft } = makeRecipeDetailResponse({
    title: "Original soup",
    description: "Original description",
    source_url: SOURCE_URL,
    source_domain: SOURCE_DOMAIN,
    source_site_name: SOURCE_SITE_NAME,
    source_author: SOURCE_AUTHOR,
    image_url: "https://example.com/soup.jpg",
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    total_time_minutes: 30,
    base_servings: "4.00",
    servings_unit: BOWLS_UNIT,
    is_favorite: true,
    tags: [TAG],
    ingredients: [
      {
        position: 1,
        original_text: "2 cups carrots",
        quantity: "2.00",
        quantity_text: "2",
        unit: "cups",
        name: "carrots",
        preparation_note: null,
        is_optional: true,
        scale_locked: true,
        parse_status: "parsed",
      },
    ],
    steps: [{ position: 1, instruction: "Simmer", section_title: "Soup" }],
    tips: [{ position: 1, tip: "Serve warm" }],
  });
  return draft;
};

const makeValues = (): RecipeEditFormValues => ({
  title: REVIEWED_TITLE,
  description: null,
  image_url: null,
  prep_time_minutes: null,
  cook_time_minutes: null,
  total_time_minutes: null,
  base_servings: null,
  servings_unit: null,
  is_favorite: false,
  ingredients: [],
  steps: [],
  tips: [],
});

describe("formatImportDraft", () => {
  it("uses reviewed values and clears fields without restoring old draft values", () => {
    const result = formatImportDraft(makeDraft(), makeValues());

    expect(JSON.parse(JSON.stringify(result))).toEqual({
      title: REVIEWED_TITLE,
      is_favorite: false,
      ingredients: [],
      steps: [],
      tips: [],
      source_url: SOURCE_URL,
      source_domain: SOURCE_DOMAIN,
      source_site_name: SOURCE_SITE_NAME,
      source_author: SOURCE_AUTHOR,
      tags: [TAG],
    });
  });

  it("preserves reviewed metadata, decimal servings, zero minutes, and false favorite", () => {
    const draft = makeDraft();
    const values: RecipeEditFormValues = {
      ...makeValues(),
      description: "Reviewed description",
      image_url: "https://example.com/new.jpg",
      prep_time_minutes: 0,
      cook_time_minutes: 0,
      total_time_minutes: 0,
      base_servings: 1.5,
      servings_unit: BOWLS_UNIT,
      ingredients: draft.ingredients,
      steps: [{ ...draft.steps[0], instruction: "Simmer gently" }],
      tips: [{ position: 1, tip: "Add pepper" }],
    };
    const before = JSON.stringify({ draft, values });

    expect(formatImportDraft(draft, values)).toEqual({
      ...values,
      source_url: draft.source_url,
      source_domain: draft.source_domain,
      source_site_name: draft.source_site_name,
      source_author: draft.source_author,
      tags: draft.tags,
    });
    expect(JSON.stringify({ draft, values })).toBe(before);
  });

  it("omits absent source metadata and preserves an empty tag list", () => {
    const draft = {
      ...makeDraft(),
      source_url: null,
      source_domain: null,
      source_site_name: null,
      source_author: null,
      tags: [],
    };

    expect(JSON.parse(JSON.stringify(formatImportDraft(draft, makeValues())))).toEqual({
      title: REVIEWED_TITLE,
      is_favorite: false,
      ingredients: [],
      steps: [],
      tips: [],
      tags: [],
    });
  });
});
