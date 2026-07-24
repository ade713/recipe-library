# Mobile UI Screens

Mobile is the first client. Desktop/web can come later.

## 1. Recipe Library

Purpose: browse saved recipes.

Elements:

- Search bar
- Import Recipe button
- Add Manually button
- Filter chips: All, Favorites, Dinner, Quick, Chicken, Vegetarian
- Recipe cards with image, title, total time, servings, tags, favorite icon
- Empty state when no recipes exist

## 2. Manual Recipe Entry

Purpose: create a recipe without depending on URL import.

Elements:

- Title field
- Optional source URL
- Optional image URL
- Prep/cook/total time fields
- Servings/yield field
- Editable ingredients list
- Editable instructions list
- Editable source tips list
- Tag picker
- Save Recipe button

## 3. Import Recipe

Purpose: paste a recipe URL and request an import preview.

Elements:

- URL input
- Import Recipe button
- Loading state
- Success route to preview/edit screen
- Partial success warning
- Failed/blocked state with Try Again, Enter Manually, and Open Original URL actions
- Duplicate state with Open Saved Recipe and Import as Copy actions

## 4. Import Preview / Edit Recipe

Purpose: review and edit imported draft data before saving.

Elements:

- Editable title
- Image preview
- Prep/cook/total time fields
- Servings field
- Editable ingredients list
- Editable instructions list
- Editable source tips list
- Tag picker
- Source link
- Save Recipe button

## 5. Recipe Detail / Cooking View

Purpose: clean view while cooking.

Elements:

- Title
- Source link
- Favorite toggle
- Portion scaler: `1x`, `2x`, `3x`
- Time summary
- Ingredients with optional checkboxes
- Indicator for unparsed/unscaled ingredients
- Instructions in numbered order
- Source tips section
- User notes section
- Edit recipe button

## 6. Search / Filter

Can be integrated into the Recipe Library screen for MVP.

Filters:

- Search text
- Tags
- Favorites only
- Max total time
- Ingredient contains
- Sort by newest/title/time

## 7. Settings / Account

MVP can be minimal:

- Current user email
- Logout
- App version
