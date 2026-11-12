import { act, renderHook } from "@testing-library/react-native";

import { useFormTextRows } from "../use-form-text-rows";

const BLANK_TEXT = "";
const SECTION_TITLE_1 = "Preparation";
const MIX_TEXT = "Mix";

type StepRowData = { text: string; section_title: string | null };

const createStepRow = (): StepRowData => ({ text: BLANK_TEXT, section_title: null });

describe("useFormTextRows", () => {
  it("initializes saved metadata and preserves it when text changes", async () => {
    const editedText = "Mix gently";
    const initialRows: StepRowData[] = [{ text: MIX_TEXT, section_title: SECTION_TITLE_1 }];

    const { result } = await renderHook(() => useFormTextRows({ initialRows, createRow: createStepRow }));

    expect(result.current.rows).toEqual([{ id: 0, text: MIX_TEXT, section_title: SECTION_TITLE_1 }]);

    await act(async () => result.current.updateRow(0, editedText));
    expect(result.current.rows).toEqual([{ id: 0, text: editedText, section_title: SECTION_TITLE_1 }]);
    expect(initialRows).toEqual([{ text: MIX_TEXT, section_title: SECTION_TITLE_1 }]);
  });

  it("uses the factory for new rows and never reuses removed IDs", async () => {
    const cookingSectionTitle = "Cooking";
    const bakeText = "Bake";
    const initialRows: StepRowData[] = [
      { text: MIX_TEXT, section_title: SECTION_TITLE_1 },
      { text: bakeText, section_title: cookingSectionTitle },
    ];
    const { result } = await renderHook(() => useFormTextRows({ initialRows, createRow: createStepRow }));

    await act(async () => {
      result.current.removeRow(0);
      result.current.addRow();
    });
    expect(result.current.rows).toEqual([
      { id: 1, text: bakeText, section_title: cookingSectionTitle },
      { id: 2, text: BLANK_TEXT, section_title: null },
    ]);

    await act(async () => {
      result.current.removeRow(1);
      result.current.removeRow(2);
      result.current.addRow();
      result.current.addRow();
    });
    expect(result.current.rows).toEqual([
      { id: 3, text: BLANK_TEXT, section_title: null },
      { id: 4, text: BLANK_TEXT, section_title: null },
    ]);
  });

  it("supports empty editing rows and a single blank creation row independently", async () => {
    const createRow = () => ({ text: BLANK_TEXT });

    const { result } = await renderHook(() => ({
      editing: useFormTextRows({ initialRows: [], createRow }),
      creation: useFormTextRows({ initialRows: [{ text: BLANK_TEXT }], createRow }),
    }));

    expect(result.current.editing.rows).toEqual([]);
    expect(result.current.creation.rows).toEqual([{ id: 0, text: BLANK_TEXT }]);

    await act(async () => result.current.editing.addRow());
    expect(result.current.editing.rows).toEqual([{ id: 0, text: BLANK_TEXT }]);
    expect(result.current.creation.rows).toEqual([{ id: 0, text: BLANK_TEXT }]);
  });

  it("does not reset draft rows or IDs when initialization props change", async () => {
    const initialText = "Saved";
    const changeText = "Changed prop";
    const draftText = "Draft";

    const { result, rerender } = await renderHook(
      ({ text }: { text: string }) =>
        useFormTextRows({
          initialRows: [{ text }],
          createRow: () => ({ text: BLANK_TEXT }),
        }),
      { initialProps: { text: initialText } },
    );

    await act(async () => result.current.updateRow(0, draftText));
    await rerender({ text: changeText });
    expect(result.current.rows).toEqual([{ id: 0, text: draftText }]);

    await act(async () => result.current.addRow());
    expect(result.current.rows).toEqual([
      { id: 0, text: draftText },
      { id: 1, text: BLANK_TEXT },
    ]);
  });
});
