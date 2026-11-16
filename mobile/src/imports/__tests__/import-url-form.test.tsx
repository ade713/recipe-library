import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ImportUrlForm } from "../import-url-form";

const PREVIEW_LABEL = "Preview recipe";
const RECIPE_URL = "https://Example.com/recipes/soup?lang=en#ingredients";
const REQUEST_ERROR_MESSAGE = "Unable to preview recipe. Please try again.";
const URL_LABEL = "Recipe URL";
const VALIDATION_ERROR_MESSAGE = "Enter a valid HTTP or HTTPS recipe URL.";

const renderForm = async (onSubmit = jest.fn().mockResolvedValue(undefined)) => {
  await render(<ImportUrlForm onSubmit={onSubmit} />);
  return onSubmit;
};
const submit = async () => {
  await fireEvent.press(screen.getByRole("button", { name: PREVIEW_LABEL }));
};

describe("ImportUrlForm", () => {
  it("locks controls during a request and allows correction after failure", async () => {
    const entered = `  ${RECIPE_URL}  `;
    const correctedUrl = "https://example.com/another-recipe";
    const networkErrorMessage = "Network failure";

    let rejectRequest!: (error: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectRequest = reject;
    });
    const onSubmit = jest.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), entered);
    await submit();
    try {
      expect(screen.getByLabelText(URL_LABEL)).toBeDisabled();
      expect(screen.getByRole("button", { name: PREVIEW_LABEL })).toBeDisabled();
      await submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(RECIPE_URL);
    } finally {
      await act(async () => {
        rejectRequest(new Error(networkErrorMessage));
      });
    }

    expect(screen.getByText(REQUEST_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.getByLabelText(URL_LABEL)).toHaveDisplayValue(entered);
    expect(screen.getByLabelText(URL_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: PREVIEW_LABEL })).toBeEnabled();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), correctedUrl);
    await submit();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenNthCalledWith(2, correctedUrl);
    expect(screen.queryByText(REQUEST_ERROR_MESSAGE)).toBeNull();
  });

  it.each([RECIPE_URL, "http://example.com/soup"])(
    "preserves entered text and submits the trimmed original URL: %p",
    async (url) => {
      const entered = `  ${url}  `;

      const onSubmit = await renderForm();

      await fireEvent.changeText(screen.getByLabelText(URL_LABEL), entered);
      expect(screen.getByLabelText(URL_LABEL)).toHaveDisplayValue(entered);

      await submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(url);
    },
  );

  it.each(["", " \n ", "not a URL", "example.com/soup", "ftp://example.com/soup", "javascript:alert(1)"])(
    "rejects invalid or unsupported URLs without requesting: %p",
    async (url) => {
      const onSubmit = await renderForm();

      await fireEvent.changeText(screen.getByLabelText(URL_LABEL), url);
      await submit();
      expect(screen.getByText(VALIDATION_ERROR_MESSAGE)).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByLabelText(URL_LABEL)).toBeEnabled();
      expect(screen.getByRole("button", { name: PREVIEW_LABEL })).toBeEnabled();
    },
  );

  it("allows correction after validation failure", async () => {
    const onSubmit = await renderForm();

    await submit();
    expect(screen.getByText(VALIDATION_ERROR_MESSAGE)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(onSubmit).toHaveBeenCalledWith(RECIPE_URL);
    expect(screen.queryByText(VALIDATION_ERROR_MESSAGE)).toBeNull();
  });

  it("shows safe request feedback, preserves input, and allows retry", async () => {
    const entered = `  ${RECIPE_URL}  `;
    const privateErrorMessage = "Internal fetch failure";

    const onSubmit = jest.fn().mockRejectedValueOnce(new Error(privateErrorMessage)).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), entered);
    await submit();
    expect(screen.getByText(REQUEST_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();
    expect(screen.getByLabelText(URL_LABEL)).toHaveDisplayValue(entered);
    expect(screen.getByLabelText(URL_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: PREVIEW_LABEL })).toBeEnabled();

    await submit();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenNthCalledWith(2, RECIPE_URL);
    expect(screen.queryByText(REQUEST_ERROR_MESSAGE)).toBeNull();
  });
});
