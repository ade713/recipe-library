import { render, fireEvent, screen } from "@testing-library/react-native";
import { RecipeOptionButton } from "../recipe-option-button";

const LABEL = "Favorites";

type RenderRecipeOptionButtonProps = {
  label?: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const renderRecipeOptionButton = async ({
  label = LABEL,
  selected = false,
  onPress = jest.fn(),
  accessibilityLabel,
}: RenderRecipeOptionButtonProps): Promise<void> => {
  await render(
    <RecipeOptionButton label={label} selected={selected} onPress={onPress} accessibilityLabel={accessibilityLabel} />,
  );
};

describe("RecipeOptionButton", () => {
  it("invokes its callback when pressed", async () => {
    const onPress = jest.fn();

    await renderRecipeOptionButton({ onPress });

    await fireEvent.press(await screen.findByRole("button", { name: LABEL }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("exposes selected state as %s", async (selected) => {
    await renderRecipeOptionButton({ selected });

    const button = await screen.findByRole("button", { name: LABEL });
    if (selected) {
      expect(button).toBeSelected();
    } else {
      expect(button).not.toBeSelected();
    }
  });

  it("uses a custom accessible label while preserving visible text", async () => {
    const label = "Newest";
    const accessibilityLabel = `Sort by: ${label}`;

    await renderRecipeOptionButton({ label, accessibilityLabel });

    expect(await screen.findByRole("button", { name: accessibilityLabel })).toBeTruthy();
    expect(screen.getByText(label)).toBeTruthy();
  });
});
