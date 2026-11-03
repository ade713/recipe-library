import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { RecipeEditForm } from "../recipe-edit-form";

const IMAGE_LABEL = "Image URL (optional)";
const INVALID_MESSAGE = "Enter a valid HTTP or HTTPS image URL.";
const SAVE_LABEL = "Save changes";
const SAVED_URL = "https://example.com/bread.jpg";

const renderForm = async (
  onSubmit = jest.fn().mockResolvedValue(undefined),
  initialImageUrl: string | null = SAVED_URL,
) => {
  await render(<RecipeEditForm initialTitle='Bread' initialImageUrl={initialImageUrl} onSubmit={onSubmit} />);
  return onSubmit;
};

describe("RecipeEditForm image URL", () => {
  it("prefills and preserves an untouched image URL", async () => {
    const onSubmit = await renderForm();

    expect(screen.getByLabelText(IMAGE_LABEL)).toHaveDisplayValue(SAVED_URL);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: SAVED_URL }));
  });

  it.each(["http://example.com", "https://EXAMPLE.com/photo%20one.jpg?size=large"])(
    "trims only on submission and preserves the supplied URL: %s",
    async (url) => {
      const onSubmit = await renderForm();

      await fireEvent.changeText(screen.getByLabelText(IMAGE_LABEL), `  ${url}  `);
      expect(screen.getByLabelText(IMAGE_LABEL)).toHaveDisplayValue(`  ${url}  `);

      await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: url }));
    },
  );

  it("shows null as blank and submits null", async () => {
    const onSubmit = await renderForm(jest.fn().mockResolvedValue(undefined), null);

    expect(screen.getByLabelText(IMAGE_LABEL)).toHaveDisplayValue("");

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: null }));
  });

  it.each(["", "  "])("clears an existing URL with null: %p", async (value) => {
    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText(IMAGE_LABEL), value);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: null }));
  });

  it.each(["not a url", "https://", "/photo.jpg", "ftp://example.com/photo.jpg", "javascript:alert(1)"])(
    "rejects an invalid URL and allows correction: %s",
    async (value) => {
      const onSubmit = await renderForm();

      await fireEvent.changeText(screen.getByLabelText(IMAGE_LABEL), value);
      await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
      expect(screen.getByText(INVALID_MESSAGE)).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();

      await fireEvent.changeText(screen.getByLabelText(IMAGE_LABEL), SAVED_URL);
      await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ image_url: SAVED_URL }));
      expect(screen.queryByText(INVALID_MESSAGE)).toBeNull();
    },
  );

  it("disables the input while saving and preserves edits after failure for retry", async () => {
    const editedUrl = "  https://example.com/new.jpg  ";
    const networkErrorMessage = "Network failure";
    let rejectSave!: (error: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });

    const onSubmit = jest.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(IMAGE_LABEL), editedUrl);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(screen.getByLabelText(IMAGE_LABEL)).toHaveProp("editable", false);
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeDisabled();

    await act(async () => {
      rejectSave(new Error(networkErrorMessage));
    });
    expect(screen.getByText("Unable to save changes. Please try again.")).toBeTruthy();
    expect(screen.getByLabelText(IMAGE_LABEL)).toHaveDisplayValue(editedUrl);
    expect(screen.getByLabelText(IMAGE_LABEL)).toHaveProp("editable", true);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenNthCalledWith(2, expect.objectContaining({ image_url: editedUrl.trim() }));
  });
});
