import { useHeaderHeight } from "expo-router/react-navigation";

import { ImportRecipeScreen } from "@/imports/import-recipe-screen";

export default function ImportRecipeRoute() {
  const headerHeight = useHeaderHeight();

  return <ImportRecipeScreen headerHeight={headerHeight} />;
}
