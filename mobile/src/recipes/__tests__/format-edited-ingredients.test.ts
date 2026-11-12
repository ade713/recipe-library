import type { RecipeIngredient } from "@/types/recipe";

import { formatEditedIngredients } from "../format-edited-ingredients";
import type { FormIngredientRow } from "../format-edited-ingredients";

const SAVED: RecipeIngredient = {
  position: 4,
  original_text: "2 cups chopped carrots",
  quantity: "2.00",
  quantity_text: "2",
  unit: "cups",
  name: "carrots",
  preparation_note: "chopped",
  is_optional: true,
  scale_locked: true,
  parse_status: "parsed",
};

describe("formatEditedIngredients", () => {
  it("trims saved text while preserving metadata when the ingredient is unchanged", () => {
    const savedIngredient = { ...SAVED, original_text: `  ${SAVED.original_text}\n` };
    const rows = [{ id: 7, text: savedIngredient.original_text, savedIngredient }];

    expect(formatEditedIngredients(rows)).toEqual([{ ...SAVED, position: 1 }]);
    expect(savedIngredient.original_text).toBe(`  ${SAVED.original_text}\n`);
  });

  it.each([SAVED.original_text, `  ${SAVED.original_text}\n`])(
    "preserves saved metadata when trimmed text is unchanged: %p",
    (text) => {
      const rows = [{ id: 7, text, savedIngredient: SAVED }];

      expect(formatEditedIngredients(rows)).toEqual([{ ...SAVED, position: 1 }]);
    },
  );

  it.each([false, true])("clears stale parsed fields while preserving existing flags: %p", (flag) => {
    const savedIngredient = { ...SAVED, is_optional: flag, scale_locked: flag };
    const text = "  3 cups sliced carrots  ";

    expect(formatEditedIngredients([{ id: 7, text, savedIngredient }])).toEqual([
      {
        position: 1,
        original_text: text.trim(),
        quantity: null,
        quantity_text: null,
        unit: null,
        name: null,
        preparation_note: null,
        is_optional: flag,
        scale_locked: flag,
        parse_status: "unparsed",
      },
    ]);
  });

  it("omits blank rows, numbers remaining rows, and defaults new ingredients", () => {
    const rows: FormIngredientRow[] = [
      { id: 9, text: " \n ", savedIngredient: SAVED },
      { id: 12, text: SAVED.original_text, savedIngredient: SAVED },
      { id: 15, text: "  Salt to taste  ", savedIngredient: null },
    ];

    expect(formatEditedIngredients(rows)).toEqual([
      { ...SAVED, position: 1 },
      {
        position: 2,
        original_text: "Salt to taste",
        quantity: null,
        quantity_text: null,
        unit: null,
        name: null,
        preparation_note: null,
        is_optional: false,
        scale_locked: false,
        parse_status: "unparsed",
      },
    ]);
  });

  it("returns an empty array for removed or entirely blank ingredients", () => {
    expect(formatEditedIngredients([])).toEqual([]);
    expect(formatEditedIngredients([{ id: 0, text: "  ", savedIngredient: SAVED }])).toEqual([]);
  });

  it("leaves draft text and saved metadata intact so reverting text restores metadata", () => {
    const rows: FormIngredientRow[] = [{ id: 7, text: "  3 cups carrots  ", savedIngredient: { ...SAVED } }];
    const before = JSON.parse(JSON.stringify(rows));

    formatEditedIngredients(rows);
    expect(rows).toEqual(before);

    const revertedRows = rows.map((row) => ({ ...row, text: SAVED.original_text }));

    expect(formatEditedIngredients(revertedRows)).toEqual([{ ...SAVED, position: 1 }]);
  });
});
