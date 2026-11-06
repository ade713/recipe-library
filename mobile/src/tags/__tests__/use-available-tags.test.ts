import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as tagService from "../tag-service";
import { useAvailableTags } from "../use-available-tags";
import type { TagListResponse } from "@/types/tag";

const DINNER = { id: "dinner-id", name: "Dinner" };
const QUICK = { id: "quick-id", name: "Quick" };

const deferredTags = () => {
  let resolve!: (value: TagListResponse) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<TagListResponse>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("useAvailableTags", () => {
  it.each([{ items: [] }, { items: [DINNER] }])(
    "loads available tags, including an empty response: $items",
    async ({ items }) => {
      const pending = deferredTags();
      const loadMock = jest.spyOn(tagService, "loadTags").mockReturnValue(pending.promise);

      const { result } = await renderHook(() => useAvailableTags());

      expect(result.current.isLoadingTags).toBe(true);
      expect(result.current.tags).toEqual([]);

      await act(async () => {
        pending.resolve({ items });
      });
      expect(result.current.tags).toEqual(items);
      expect(result.current.isLoadingTags).toBe(false);
      expect(result.current.tagError).toBeNull();
      expect(loadMock).toHaveBeenCalledTimes(1);
    },
  );

  it("reports a safe error and retries, ignoring retries while loading", async () => {
    const privateErrorMessage = "Private failure";
    const tagsLoadErrorMessage = "Unable to load tags.";
    const pending = deferredTags();

    const loadMock = jest
      .spyOn(tagService, "loadTags")
      .mockRejectedValueOnce(new Error(privateErrorMessage))
      .mockReturnValueOnce(pending.promise);

    const { result } = await renderHook(() => useAvailableTags());

    await waitFor(() => expect(result.current.tagError).toBe(tagsLoadErrorMessage));
    expect(result.current.isLoadingTags).toBe(false);

    await act(async () => {
      result.current.retryLoadingTags();
    });
    expect(result.current.tagError).toBeNull();
    expect(result.current.isLoadingTags).toBe(true);

    await act(async () => {
      result.current.retryLoadingTags();
    });
    expect(loadMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending.resolve({ items: [DINNER] });
    });
    expect(result.current.tags).toEqual([DINNER]);
    expect(result.current.isLoadingTags).toBe(false);
  });

  it("appends created tags without losing previous additions", async () => {
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [] });

    const { result } = await renderHook(() => useAvailableTags());

    await waitFor(() => expect(result.current.isLoadingTags).toBe(false));
    await act(async () => {
      result.current.addTag(DINNER);
      result.current.addTag(QUICK);
    });
    expect(result.current.tags).toEqual([DINNER, QUICK]);
  });

  it("clears old tags and reloads when the key changes", async () => {
    const pending = deferredTags();
    jest
      .spyOn(tagService, "loadTags")
      .mockResolvedValueOnce({ items: [DINNER] })
      .mockReturnValueOnce(pending.promise);

    const { result, rerender } = await renderHook(({ key }: { key: string }) => useAvailableTags(key), {
      initialProps: { key: "one" },
    });

    await waitFor(() => expect(result.current.tags).toEqual([DINNER]));
    await rerender({ key: "two" });
    expect(result.current.tags).toEqual([]);
    expect(result.current.isLoadingTags).toBe(true);

    await act(async () => {
      pending.resolve({ items: [QUICK] });
    });
    expect(result.current.tags).toEqual([QUICK]);
  });

  it.each(["success", "failure"])(
    "ignores an old request's late %s and finally while the new request loads",
    async (outcome) => {
      const oldRequestErrorMessage = "Old request failed";
      const oldRequest = deferredTags();
      const newRequest = deferredTags();

      jest
        .spyOn(tagService, "loadTags")
        .mockReturnValueOnce(oldRequest.promise)
        .mockReturnValueOnce(newRequest.promise);

      const { result, rerender } = await renderHook(({ key }: { key: string }) => useAvailableTags(key), {
        initialProps: { key: "one" },
      });

      await rerender({ key: "two" });
      expect(tagService.loadTags).toHaveBeenCalledTimes(2);

      await act(async () => {
        if (outcome === "success") oldRequest.resolve({ items: [DINNER] });
        else oldRequest.reject(new Error(oldRequestErrorMessage));
      });
      expect(result.current.tags).toEqual([]);
      expect(result.current.tagError).toBeNull();
      expect(result.current.isLoadingTags).toBe(true);

      await act(async () => {
        newRequest.resolve({ items: [QUICK] });
      });
      expect(result.current.tags).toEqual([QUICK]);
      expect(result.current.isLoadingTags).toBe(false);
    },
  );
});
