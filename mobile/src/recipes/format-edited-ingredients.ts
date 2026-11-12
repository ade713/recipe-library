import type { RecipeIngredient } from "@/types/recipe";

export type FormIngredientRow = {
  id: number;
  text: string;
  savedIngredient: RecipeIngredient | null;
};

const ingredientDefaults = {
  quantity: null,
  quantity_text: null,
  unit: null,
  name: null,
  preparation_note: null,
  is_optional: false,
  scale_locked: false,
  parse_status: "unparsed",
};

export function formatEditedIngredients(rows: FormIngredientRow[]): RecipeIngredient[] {
  const formattedIngredients = rows
    .filter((row) => row.text.trim().length > 0)
    .map((row, index) => {
      const position = index + 1;
      const text = row.text.trim();

      if (row.savedIngredient === null) {
        return { ...ingredientDefaults, position, original_text: text };
      }

      if (text === row.savedIngredient.original_text.trim()) {
        return { ...row.savedIngredient, position, original_text: text };
      }

      return {
        ...ingredientDefaults,
        position,
        original_text: text,
        is_optional: row.savedIngredient.is_optional,
        scale_locked: row.savedIngredient.scale_locked,
      };
    });

  return formattedIngredients;
}
