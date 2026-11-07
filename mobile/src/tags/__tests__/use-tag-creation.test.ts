import { act, renderHook } from "@testing-library/react-native";

import { ApiError } from "@/api/errors";

import { useTagCreation } from "../use-tag-creation";
import * as tagService from "../tag-service";

const DINNER = { id: "dinner-id", name: "Dinner" };
const QUICK = { id: "quick-id", name: "Quick" };
const LENGTH_ERROR = "Tag names must be 50 characters or fewer.";

const renderCreation = async (searchTerm = QUICK.name, disabled = false, onCreated = jest.fn()) => {
  const hook = await renderHook(() => useTagCreation({ tags: [DINNER], searchTerm, disabled, onCreated }));
  return { ...hook, onCreated };
};

describe("useTagCreation", () => {
  it.each([
    { search: "", eligible: false, error: null },
    { search: "  ", eligible: false, error: null },
    { search: " dinner ", eligible: false, error: null },
    { search: "Din", eligible: true, error: null },
    { search: `  ${QUICK.name}  `, eligible: true, error: null },
    { search: "🍲".repeat(50), eligible: true, error: null },
    { search: "🍲".repeat(51), eligible: false, error: LENGTH_ERROR },
  ])("derives eligibility and guards creation for $search", async ({ search, eligible, error }) => {
    const saveMock = jest.spyOn(tagService, "saveTag").mockResolvedValue(QUICK);

    const { result } = await renderCreation(search);

    expect(result.current.newTagName).toBe(search.trim());
    expect(result.current.canCreateTag).toBe(eligible);
    expect(result.current.nameError).toBe(error);

    if (!eligible) {
      await act(async () => {
        await result.current.createTag();
      });
      expect(saveMock).not.toHaveBeenCalled();
    }
  });

  it("sends the trimmed name and passes the returned tag to its owner", async () => {
    const saveMock = jest.spyOn(tagService, "saveTag").mockResolvedValue(QUICK);

    const { result, onCreated } = await renderCreation(`  ${QUICK.name}  `);

    await act(async () => {
      await result.current.createTag();
    });
    expect(saveMock).toHaveBeenCalledWith(QUICK.name);
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(QUICK);
    expect(result.current.isCreatingTag).toBe(false);
    expect(result.current.tagCreateError).toBeNull();
  });

  it("keeps an eligible action visible but prevents requests when disabled", async () => {
    const saveMock = jest.spyOn(tagService, "saveTag").mockResolvedValue(QUICK);

    const { result } = await renderCreation(QUICK.name, true);

    expect(result.current.canCreateTag).toBe(true);

    await act(async () => {
      await result.current.createTag();
    });
    expect(saveMock).not.toHaveBeenCalled();
    expect(result.current.isCreatingTag).toBe(false);
  });

  it("exposes pending state and ignores another creation while pending", async () => {
    let resolveCreate!: (tag: typeof QUICK) => void;
    const pending = new Promise<typeof QUICK>((resolve) => {
      resolveCreate = resolve;
    });

    const saveMock = jest.spyOn(tagService, "saveTag").mockReturnValue(pending);

    const { result, onCreated } = await renderCreation();

    await act(async () => {
      void result.current.createTag();
    });
    expect(result.current.isCreatingTag).toBe(true);
    expect(result.current.canCreateTag).toBe(true);

    await act(async () => {
      await result.current.createTag();
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate(QUICK);
    });
    expect(result.current.isCreatingTag).toBe(false);
    expect(onCreated).toHaveBeenCalledWith(QUICK);
  });

  it.each([
    { error: new ApiError(409), message: "A tag with this name already exists." },
    { error: new Error("Private failure"), message: "Unable to create tag. Please try again." },
  ])("reports safe errors, supports clearing, and retries: $message", async ({ error, message }) => {
    const saveMock = jest.spyOn(tagService, "saveTag").mockRejectedValueOnce(error).mockResolvedValueOnce(QUICK);

    const { result, onCreated } = await renderCreation();

    await act(async () => {
      await result.current.createTag();
    });
    expect(result.current.tagCreateError).toBe(message);
    expect(result.current.isCreatingTag).toBe(false);
    expect(onCreated).not.toHaveBeenCalled();

    await act(async () => {
      result.current.clearTagCreateError();
    });
    expect(result.current.tagCreateError).toBeNull();

    await act(async () => {
      await result.current.createTag();
    });
    expect(saveMock).toHaveBeenCalledTimes(2);
    expect(onCreated).toHaveBeenCalledWith(QUICK);
  });
});
