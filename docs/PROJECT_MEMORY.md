# Project Memory

## Current app name

The app is now called Recipe Library.

Earlier working name:

- Recipe Vault

Reason for rename:

- Recipe Library is clearer and more direct.
- It describes the app as a personal collection of saved recipes.
- It sounds less abstract than Recipe Vault.

## Current product direction

Recipe Library is a mobile-first personal recipe-saving app.

Users can:

- Manually create recipes.
- Paste recipe URLs.
- Import recipe data when supported.
- Review and edit imported drafts.
- Save recipes to a personal library.
- Search and filter saved recipes.
- Add personal notes.
- Scale ingredients by 1x, 2x, and 3x.

## Current backend progress

The nullable recipe `difficulty` column is reserved for future use and intentionally absent from MVP API schemas. Retain it during cleanup; exposing it or removing it requires a separate feature or migration decision.

Structured ingredient parsing is deferred work for before private MVP release, not abandoned functionality. Imported ingredients currently retain original text and default to `unparsed`. The existing scaling utility handles basic leading quantities but is not connected to import normalization. Implementing conservative parsed fields and connecting them to cooking-view portion scaling remains necessary follow-up work; see `ROADMAP.md` and `BACKEND_CLEANUP_PLAN.md`.

- Manual recipe, note, and tag CRUD are implemented and user-scoped.
- Authentication, recipe search/filter/sort, safe URL fetching, import parsing, editable previews, duplicate handling, and import logging are implemented.
- Reviewed `success` and `partial` import drafts can be saved transactionally with trusted source attribution and a link back to their import log.
- The planned pre-mobile backend cleanup is complete. Week 13 mobile foundation work is now in progress.

- Missing Schema.org cook-time metadata now produces an optional-field warning rather than an unhandled HTTP 500. The parser handles SchemaOrgException through its existing missing-field handling. A regression test preserves the title and checks null cook time plus the warning; 31 related parser/import-preview tests passed. The user retried the original recipe and confirmed the preview warning.

## Current mobile progress

- PR #88 is merged. Description display is implemented below the recipe-detail title on `feature/mobile-recipe-detail-description`. The user added a null/blank guard and renders the original text, preserving internal line breaks. All 39 detail-screen tests, TypeScript, and whitespace checks pass after the final placement/original-text adjustments. The user verified the final Android multiline display beneath the title and absence of an empty block for recipes without descriptions. Discussion covered local const narrowing, preserving accessible text rather than overriding it with a generic label, and pairing presence/absence tests. No backend changes are needed. The milestone is ready for a focused PR.
- PR #87 is merged. The next agreed milestone is optional multiline description entry below the title on `feature/mobile-recipe-create-description`. Trim surrounding whitespace, preserve internal line breaks, omit blank descriptions, and retain text after a failed save. The user implemented the multiline input, optional request types, and submission normalization. Form tests cover blanks, surrounding whitespace, internal line breaks, and failed-save preservation; existing API/navigation tests now cover serialization and forwarding. All 267 mobile tests across twenty suites, TypeScript, and whitespace checks pass. The user verified Android multiline editing, keyboard/scrolling access, blank submission, and description preservation through a failed save and successful retry. Learning review confirmed that trimming during editing disrupts word spacing and trim() preserves internal line breaks. The milestone is ready for a focused PR. Description display was implemented in the subsequent detail-screen milestone recorded above. Keep this PR focused on description entry and its API/navigation coverage.
- PR #86 is merged. Optional servings/yield quantity and unit entry is implemented on `feature/mobile-recipe-create-yield`. The user implemented quantity/unit inputs, finite nonnegative decimal validation, and trimmed optional units. Shared fieldsRow, fieldColumn, and compactInput styles support both times and yield rows. Form tests cover decimal quantities, zero, blanks, trimmed units, invalid/nonfinite quantities, correction, and failed-save preservation; existing API/navigation tests verify forwarding and serialization. All 264 mobile tests across twenty suites, TypeScript, and whitespace checks pass. The user verified Android decimal yield with a unit, quantity without a unit, zero and blank values, failed-save preservation and retry, decimal keyboard access, and enlarged-text layout. Learning review clarified that servings accepts finite nonnegative decimals, minutes requires nonnegative safe integers, and JSON.stringify omits undefined properties before the API receives the request. Visible quantity/unit constants use the TEXT suffix to distinguish them from accessibility labels. The milestone is ready for a focused PR. Preserve existing backend behavior and reuse detail display; ingredient scaling is outside this PR. PR descriptions should explain what changed and why, using Reasoning rather than a Validation section.
- Optional prep, cook, and total minute inputs are implemented on `feature/mobile-recipe-create-times`. Blank values remain unspecified, zero is valid, and negative/fractional or nonnumeric values are rejected. Total time stays independently editable. The user wrote the implementation; review found validation correctly occurs before saving with separate validation/save feedback. Form tests cover conversion, correction, and retry preservation; existing navigation and API tests now verify time forwarding and serialization. All 256 mobile tests across twenty suites, TypeScript, and diff whitespace checks pass. The user verified Android saved times including zero and an independent total, blank times, failed-save preservation and retry, and keyboard/scrolling access. Learning review confirmed why validation precedes the submitting state and why validation feedback is separate from save errors. The helper converts trimmed text using a descriptive minutes variable; new test constants follow the existing ordering. PR #86 contains this milestone. A follow-up layout change groups the three times into equal-width columns under Times (minutes), preserving full accessibility labels and using 48-minimum-height inputs. The user verified the row on Android with normal and enlarged text.
- Expo SDK 57 with Expo Router and strict TypeScript is configured in `mobile/`.
- Root stack navigation and the initial Recipe Library placeholder screen are verified in Expo Go on a physical Android phone.
- The user understands the router entry point and the distinction between layout and screen components; TypeScript checking passes.
- Android-to-FastAPI health connectivity is verified through a temporary Check API button using an ignored local API URL setting.
- The API client preserves caller headers and returns undefined for 204 responses. HTTP failures now throw ApiError with a readonly numeric status; network errors propagate unchanged. Eight client tests include parameterized 401/500 coverage, and one ApiError test verifies standard error behavior. Response generics do not provide runtime validation; server error-body parsing remains follow-up work.
- A SecureStore wrapper now saves, reads, and removes access tokens. Missing tokens return null; storage failures propagate. Seven mocked storage tests cover this behavior.
- Typed login, current-user, and registration API helpers are implemented independently of storage. They reject empty responses and propagate client failures, with ten mocked auth-helper tests. RegisterRequest is distinct from LoginRequest. Registration posts JSON to /auth/register and returns UserResponse (backend HTTP 201), without signing in, storing a token, or changing auth state. Tests cover creation, undefined response, duplicate-account ApiError(409), and network failure propagation. RegisterScreen now reuses AuthForm and is connected at /register.
- The session service coordinates login, profile lookup, and token saving in that order, returning the user only after saving succeeds. Local sign-out awaits token removal without a backend request. Restoration reads the saved token, returns null when missing, and fetches the user when present. A profile 401 triggers awaited removal before returning null; network/server failures preserve the token and propagate. Storage-read and cleanup failures also propagate. Thirteen session tests cover this behavior.
- A discriminated authentication-state union and pure reducer now support loading, signedOut, authenticated, and error states. AuthProvider runs restoration on mount; useAuth returns `{ state, retryRestoration, signIn, signOut }`. Retry dispatches loading, clears the previous error, and increments an effect dependency to start another attempt. Cleanup prevents late dispatch but does not cancel requests or storage effects.
- Provider signIn awaits the session service (authentication, profile lookup, and token storage) before dispatching signInSucceeded. Pending or failed sign-in leaves signed-out state unchanged; errors propagate for the future login screen to handle locally, not through the restoration error state. Tests cover success through a consumer button and failure/pending through renderHook. Repeated strings in provider/restoration tests now use file-local constants.
- Provider signOut awaits local token removal through the session service before dispatching signOutSucceeded, which clears the user with a fresh signedOut state. Pending or failed removal preserves the authenticated state; errors propagate. Success, failure, and pending behavior are tested. No backend request or server-side token revocation occurs. The library screen now owns the sign-out control, pending/duplicate-press protection, and safe failure feedback. Keep this behavior in the screen rather than creating a one-off button component; extract shared components when reuse or complexity warrants it.
- The root layout nests AuthProvider → AuthRestorationGate → AppNavigator → Stack. The restoration gate handles loading/error; AppNavigator uses Stack.Protected for authenticated library access and signed-out login access. Backend auth/ownership enforcement remains required. The user confirmed the full mobile test suite and TypeScript checks pass after the source-attribution changes.
- The typed listRecipes(token) helper requests /recipes with a Bearer token and returns RecipeListResponse containing RecipeSummary items. It accepts an empty list, rejects undefined responses, and preserves API/network errors; five mocked tests cover these cases. Ownership is enforced by the backend, not a client-supplied user ID. Library-screen loading and submitted title search are connected; All / Favorites controls are connected; additional filters remain follow-up work.
- loadRecipes coordinates secure token retrieval and listRecipes, rejecting missing credentials and preserving storage/API errors. The library shows recipe summary cards, loading, safe errors, and successful empty results; Retry uses an effect attempt counter with cleanup guards against late updates. Android verified saved titles and session-restoration recovery after PostgreSQL restart. Later Android checks verified library refresh and search retry recovery after a backend outage. Reusable RecipeSummaryCard and FlatList rendering with stable recipe-ID keys are implemented. Android checks confirmed card content and scrolling. A bottom-edge SafeAreaView fixes Sign out overlapping Android system navigation, verified on-device. Broader layout polish and additional filters remain pending.
- LoginForm was renamed to shared AuthForm in src/auth/auth-form.tsx, with a form-owned AuthFormValues type independent of API request types. Required submitLabel and submitErrorMessage props let screens choose workflow-specific copy without branching inside the form. LoginScreen supplies sign-in configuration and connects onSubmit to useAuth().signIn. The form retains controlled, labeled inputs, secure password entry, missing-field checks, pending protection, safe failure feedback, and retry cleanup. Password whitespace remains unchanged; email trim is only a blank check. Twelve tests cover existing behavior, configurable copy, and optional synchronous validation; the test helper alone provides defaults through an options object. RegisterScreen reuses this form, supplying its own password validator. Option C styling and broader keyboard/accessibility checks remain pending.
- Android smoke testing confirmed invalid-credential feedback, login and profile HTTP 200 responses, automatic library navigation, Back not returning to login, and saved-session restoration after reopening. Connectivity required the current Mac LAN IP and Uvicorn bound to 0.0.0.0; phone and Mac must share a reachable network. No credentials or tokens are recorded in docs.
- Follow-up: audit test overlap in a focused cleanup without delaying mobile work. Keep form/provider behavior coverage separate from navigation/wiring coverage. The API client has no explicit request timeout; add stalled-request handling in follow-up work.
- Mobile CI is merged in PR #41 and runs npm ci, Jest, and tsc using Node 24. Both backend and mobile checks passed on GitHub. Verified main-branch protection requires `Tests, Ruff, and mypy` and `Mobile Tests and TypeScript`, requires up-to-date branches, and applies to administrators. Authentication integration can now continue.
- Android sign-out smoke checks passed: pressing Sign out opens login, Back cannot reopen the library, closing/reopening remains signed out, and signing in again succeeds. Device restoration error/retry verification, broader authenticated API integration, richer API-error handling, and functional recipe screens remain upcoming work. Local token removal does not revoke backend tokens. Restoration distinguishes profile 401 responses from transient failures using structured API errors; it does not restore a user when profile lookup fails.
- Follow `mobile/README.md` for setup. Track dependency audit findings before release without applying incompatible forced upgrades.

Registration now includes a signed-out route, login entry link, screen-owned eight-character password validation, success-only account-created feedback, and a replace link back to login. It does not automatically authenticate. The user confirmed the Android registration smoke checklist, including short-password validation, account creation, return to login, and sign-in with the new account. Navigation test helpers include all declared routes. Restart Expo if generated route types lag behind newly added files.

Post-auth follow-up: audit test overlap and repeated frontend constants without delaying MVP work. Share genuinely reusable values through focused modules, while keeping local fixtures/copy local where appropriate; avoid a catch-all constants utility.

## Recipe detail milestone and PR boundary

- Recipe cards now invoke optional callbacks; the library opens the selected protected detail route. The route passes its ID to RecipeDetailScreen.
- Typed getRecipe and token-coordinating loadRecipe helpers support detail requests. The screen handles loading, safe failure feedback, repeated/pending retries, title, original ingredient text, numbered steps, and explicit empty sections.
- Android verified navigation, different selected titles, Back, backend-outage error feedback, and retry recovery. Final checks confirmed original ingredient text, numbered instructions, both empty sections, and content replacement between recipes. A bottom-edge SafeAreaView around the detail ScrollView fixes Android navigation overlap; the final content is reachable above system navigation.
- The initial detail PR stopped at ingredients/instructions and empty states. Further detail presentation remains follow-up work. Conservative backend ingredient parsing remains required before scaling.
- Source attribution is now implemented: the detail screen shows the source domain when both domain and URL are present, and an accessible “Open original recipe” link whenever a source URL exists. The link uses React Native Linking.openURL; failures show safe feedback, and retrying clears the previous error. Recipes without a source URL show no attribution.
- Source-attribution tests cover domain display, hidden attribution, opening the original URL, failure feedback, and retry recovery. Android checks confirmed domain display, opening the correct original recipe, returning to the preserved detail screen, and hidden attribution for recipes without a source URL.
- Shared typed recipe and user fixture builders are complete in merged PRs #60 and #61. Source attribution is complete in merged PR #62.
- The recipe detail screen now displays preparation, cooking, and total time directly from the API values. Each null value is hidden independently; zero remains visible as 0 mins. Total time is not calculated from prep and cook times.
- Time-summary tests cover positive values, null values, and zero for all three fields. Android verification confirmed the displayed values, hidden missing times, and visible zero times.
- The time summary is complete in merged PR #63.
- The detail screen now shows an unnumbered Source tips section beneath instructions when tips are present. It renders each tip's text, uses position as the React key, and hides the entire section when tips is empty.
- Source-tips tests cover rendering multiple tips and hiding the empty section. The user confirmed Android verification: tips and their heading display, the final tip is reachable above system navigation, and recipes without tips show no section heading.
- Source tips are complete in merged PR #64.
- The detail screen now displays Servings: followed by base_servings when servings_unit is null, or Yield: followed by the quantity and unit when a unit is present. The API quantity string is preserved without numeric conversion. A null quantity hides the display even when a unit exists; zero remains visible.
- Servings/yield tests cover a quantity without a unit, a quantity with a unit, a missing quantity, and zero servings. The user confirmed Android verification for these four cases.
- Servings/yield display is complete in merged PR #65. Portion scaling remains separate and requires conservative backend ingredient parsing first.
- The mobile setRecipeFavorite API helper now sends an authenticated PATCH to /recipes/{recipe_id} with only the desired is_favorite boolean, returns the updated recipe, rejects an empty response, and preserves API/network failures. The shared API client supplies the JSON content-type header.
- The updateRecipeFavorite service retrieves the stored token before calling the API helper. Missing tokens and storage failures prevent the request; API failures propagate unchanged. Tests cover both true and false through both layers, empty API responses, and failure paths.
- The full mobile suite and TypeScript checks passed before the final test cleanup; the user confirmed the service tests remained green after removing unused variables and adding the false-state case.
- Favorite API/service support is complete in merged PR #66.
- The detail screen now provides Add to favorites and Remove from favorites controls. It submits the desired state through updateRecipeFavorite and displays the returned recipe only after success. While saving, the button is disabled and the handler guards against duplicate requests. Failures preserve the saved state, show safe feedback, and re-enable the button; retrying clears the error.
- Favorite-control tests cover adding, removing, pending protection, failure feedback, and successful retry. The full mobile suite passed with 179 tests across eighteen suites, and TypeScript passed; the user confirmed the final retry assertions also pass.
- Android verification confirmed adding and removing favorites, persistence after reopening a recipe, safe failure feedback with the backend unavailable, and successful retry after restarting the backend.
- The detail-screen favorite control is complete in merged PR #67.
- The library now reloads recipes on focus, including when returning from detail, so cards reflect saved favorite changes. useFocusEffect wraps a useCallback whose loadingAttempt dependency preserves retry behavior without restarting requests on every render. Cleanup ignores late results after blur or a replaced attempt; it does not cancel requests.
- A navigation regression test verifies an initially non-favorite card becomes a favorite after returning from detail. Library-screen tests now use renderRouter to supply real navigation context while preserving loading, retry, and sign-out coverage. The user confirmed the full mobile suite and final navigation test pass; TypeScript checking passes.
- Android verification confirmed favorite indicators appear and disappear after returning from detail, a failed refresh shows feedback when the backend is unavailable, and Retry recovers after the backend restarts.
- Library focus refresh is complete in merged PR #68.
- Mobile recipe search API/service support is implemented. listRecipes accepts optional ListRecipesOptions with a query field, encodes it as the backend q parameter using URLSearchParams, and omits the query string for missing or empty queries. Nonempty query text is passed through without trimming; special characters are encoded safely.
- loadRecipes reuses the exported ListRecipesOptions type and forwards options after retrieving the stored token. Existing authentication, response validation, and error propagation behavior is preserved.
- Search tests cover a query containing spaces, empty input, special-character encoding, and service forwarding. The full mobile suite passed with 184 tests across eighteen suites, and TypeScript passed before the final shared-type and test-grouping cleanup.
- Search API/service support is complete in merged PR #69.
- The library now has a labeled Search recipes input and an explicit Search button. Draft input is separate from the submitted query, so typing alone leaves results unchanged. Submission trims surrounding whitespace; submitting empty or whitespace-only text restores the full library. Empty search results show No recipes match your search, distinct from an empty saved library.
- Retry and focus refresh use the submitted query even when the draft input has changed. Navigation tests verify a new request after returning from detail, and screen tests cover submission, typing without submission, clearing, trimming, empty results, and retry recovery. The full mobile suite passed with 192 tests across eighteen suites, and TypeScript passed.
- Android verification confirmed search submission, empty-result feedback, clearing with empty or whitespace-only input, preserved search on return from detail, backend-failure retry recovery, and access to the Search button with the keyboard open.
- Library search UI is complete in merged PR #70.
- ListRecipesOptions now accepts an optional favorite boolean. The API helper serializes both true and false explicitly and combines the filter with title search. Omitting favorite returns both favorite and non-favorite recipes; false means non-favorites only.
- The existing loadRecipes service forwards the shared options without additional implementation. API tests cover both boolean values and combining search with favorites; the existing service forwarding test now covers both options rather than duplicating coverage. The full mobile suite passed with 195 tests across eighteen suites, and TypeScript passed.
- Favorite-filter API/service support is complete in merged PR #71.
- The library now provides All / Favorites controls. All omits the favorite parameter; Favorites sends true. Both preserve the submitted search through filtering, retry, and focus refresh. Buttons expose accessible selected state, and Showing: All / Showing: Favorites text provides a visible active-filter indication.
- Empty Favorites results without a search show No favorite saved recipes yet. An active search takes priority and shows No recipes match your search; an empty unfiltered library retains No saved recipes yet.
- Screen and navigation tests cover filtering, restoring All, search/filter coordination, empty feedback, selected state, retry, and return from detail. The full mobile suite passed with 200 tests across eighteen suites, and TypeScript passed; the user confirmed the final retry-fixture cleanup remains green.
- Android verification confirmed the active-filter indication, switching between All and Favorites, search and filter preservation after navigation, removal of an unfavorited recipe on return to Favorites, empty-result feedback, and backend-outage retry recovery.
- All / Favorites library controls are complete in merged PR #72.
- Mobile recipe sorting request support is implemented. ListRecipesOptions accepts optional sort values recent, title, and time; listRecipes serializes the sort parameter alongside search and favorite filtering. Omitting sort preserves the backend default ordering. The existing loadRecipes service forwards the shared options without additional implementation.
- API tests cover all three sort values and their combination with search and favorites. The existing service-forwarding test includes sorting rather than duplicating coverage. Backend tests remain responsible for actual result ordering. The full mobile suite passed with 203 tests across eighteen suites, and TypeScript passed.
- Sorting API/service support is complete in merged PR #73.
- The library now provides Newest, Title A–Z, and Shortest time controls. Newest is selected initially, and screen requests explicitly include sort, including recent. Sort changes reload through the existing focus effect while preserving the submitted search and Favorites filter; retry and returning from detail preserve all three options.
- Sort controls expose accessible selected state and labels prefixed with Sort by:. Visible selected-button styling is deferred to the styling pass by agreement; no additional sort-status text is required.
- Tests cover sort requests, switching back to Newest, and accessible selection. Existing retry and navigation tests were extended to include sorting rather than duplicated. The full mobile suite passed with 206 tests across eighteen suites, and TypeScript passed; the user confirmed the subsequent mock-sequencing, request-count, and accessibility-label changes remain green.
- Android emulator verification confirmed alphabetical, shortest-time (unknown times last), and newest ordering; search/Favorites preservation; sorting on return from detail; and backend-failure retry recovery. These checks used an emulator rather than a physical phone.
- Library sorting controls are complete in merged PR #74.
- Mobile maximum-total-time request support is implemented. ListRecipesOptions accepts optional maxTotalTime, which listRecipes serializes as max_total_time. An explicit undefined check preserves zero as a valid value; omission leaves results unrestricted by time. The existing loadRecipes service forwards the shared options unchanged.
- API tests cover positive and zero limits, and the existing combined-options and service-forwarding tests now include the time limit. The full mobile suite passed with 208 tests across eighteen suites, and TypeScript passed.
- Maximum-time API/service support is complete in merged PR #75.
- The library now offers Any time and 30 min or less controls. Any time omits maxTotalTime; the limited view sends 30. Search, Favorites, sorting, retry, and focus refresh retain the active time limit. Empty feedback prioritizes submitted search, then an active time filter, then Favorites, then an empty saved library.
- Time controls use Pressable with accessible selected state and a darker selected background. Related Favorites, sorting, and time controls are grouped into wrapping rows to leave more room for recipes.
- Existing retry and navigation tests now include the time limit. Screen tests cover applying and removing it, selected state, and empty-filter feedback. Final checks passed with 211 tests across eighteen suites and TypeScript passing. The user confirmed Android checks for time filtering, restoration, combined options, navigation/retry, empty feedback, and the layout changes.
- Library time filtering and row grouping are complete in merged PR #76.
- RecipeOptionButton now provides shared Pressable styling, callback forwarding, accessible selected state, and an optional custom accessible label. Favorites, sorting, and time controls all use it, with a darker background for the selected option. The existing row layout and Showing text remain in the library screen.
- The search input and Search button now share a row. The input flexes into the available width and has a visible border; search behavior and accessibility labels are unchanged.
- Component tests cover pressing, both selected states, and custom accessible labels without changing visible text. Existing screen and navigation tests preserve filter/sort behavior. The full mobile suite passed with 215 tests across nineteen suites; after the search-row change, 31 affected tests and TypeScript passed.
- The user confirmed Android checks for consistent selected styling, working controls, readable labels, wrapping, and the updated layout. Shared option controls and the search row are complete in merged PR #77; broader visual design remains follow-up work.
- Mobile manual recipe creation API/service support is implemented. RecipeCreateRequest currently contains only title. createRecipe sends an authenticated POST to /recipes, returns RecipeDetailResponse, and rejects an empty response. The backend supplies the saved ID and default fields, including empty ingredient, step, and tip lists.
- saveRecipe retrieves the stored access token before calling createRecipe. Missing credentials and storage failures prevent the request; API failures propagate unchanged. The backend remains responsible for validating tokens and enforcing authorization.
- API tests cover request serialization and the saved response contract; service tests cover token coordination, missing tokens, storage failures, and API failures. The full mobile suite passed with 221 tests across nineteen suites, and TypeScript passed.
- Title-only creation API/service support is complete in merged PR #78. Extend RecipeCreateRequest alongside supported form fields.
- RecipeCreateForm collects a recipe title and delegates saving to an asynchronous onSubmit callback. It rejects empty and whitespace-only titles, clears validation feedback on a valid submission, and disables saving while a submission is pending.
- Failed submissions show retry feedback and preserve the entered title. Successful retries clear the error, and the pending state resets after either outcome. Tests cover submission, blank-title validation, validation recovery, duplicate-submission prevention, failure feedback, and successful retry.
- The full mobile suite passed with 228 tests across twenty suites, and TypeScript passed. The user reviewed the separation between form input handling and service coordination, and why pending state resets in finally.
- The reusable title-only form is complete in merged PR #79.
- The library now provides a Create recipe button leading to /recipes/new, registered in the authenticated navigation group. Signed-out users opening the creation route are redirected to login.
- The creation screen renders RecipeCreateForm with bottom safe-area protection and delegates submission to saveRecipe. After success, router.replace opens detail using the saved recipe ID, so Back returns to the library instead of the completed form. Save failures propagate to the form and leave the user on the creation screen.
- Navigation tests cover the library entry point, signed-out access, saving and opening the returned recipe ID, and remaining on creation after failure. Existing form tests continue to cover validation, pending state, and retry without duplicating those checks at the navigation layer.
- The full mobile suite passed with 232 tests across twenty suites, and TypeScript passed. The user confirmed Android checks for keyboard usability, blank-title validation, successful creation and detail navigation, returning to the refreshed library, and failure/retry recovery after restarting the backend.
- Title-only creation screen integration is complete in merged PR #80.
- Manual creation now supports repeatable ingredient inputs, initially showing one empty row. Add ingredient appends a row; each row has a remove control alongside its input. All rows can be removed, and users can add another afterward. Save appears below the ingredient controls.
- Ingredient rows use stable local IDs for rendering and updates. Submission trims text, omits blank entries, and assigns consecutive positions starting at one. RecipeCreateRequest accepts optional ingredients containing position and original_text; title-only requests remain valid. Backend ingredient parsing remains separate follow-up work.
- Form tests cover ordered entry, trimming and blank omission, middle-row removal, and adding after removing every row. Existing retry coverage now checks ingredient preservation, and existing navigation and API tests verify forwarding and serialization without duplicating form checks.
- The creation screen uses a scrolling form inside KeyboardAvoidingView with the stack header height as its offset and bottom safe-area protection. useHeaderHeight is imported from expo-router/react-navigation for SDK 57; no external React Navigation dependency is needed.
- The full mobile suite passed with 236 tests across twenty suites, and TypeScript passed. The user verified Android row removal and re-adding, long-form scrolling and keyboard access, trimmed and ordered saved ingredients, empty ingredient feedback, and preservation through backend failure and retry.
- Manual ingredient entry is complete in merged PR #81.
- Manual creation now supports repeatable instruction inputs, initially showing one empty step. Users can add steps, remove any step, and add again after removing every row. Each step accepts multiline text; internal line breaks remain within one numbered instruction.
- Ingredients and steps share the FormTextRow UI shape but maintain separate state and stable ID counters. Submission trims step text, omits blank steps, and assigns consecutive positions using the backend's instruction field. RecipeCreateRequest accepts optional steps; recipes without instructions remain valid.
- Form tests cover ordered steps, whitespace trimming with internal line breaks preserved, middle-step removal, and adding after removing every step. Existing retry, navigation, and API tests now include steps to cover preservation, forwarding, and serialization without duplicating tests.
- Inputs now have visible placeholders and borders. Shared input styling is separate from row-only flex sizing so the title input does not flex like an ingredient or step input.
- The full mobile suite passed with 240 tests across twenty suites, and TypeScript passed. The user verified Android step removal and re-adding, multiline saved instructions, trimmed and consecutively numbered steps, keyboard access, failure/retry preservation, and the empty-instructions state.
- Manual instruction entry is complete in merged PR #82. Repeatable tips and step section headings remain follow-up work.
- RecipeFormTextRow now shares the ingredient/step input, remove button, accessibility labels, and row styling. Multiline steps align text at the top; single-line ingredients use centered vertical alignment. The form retains row state and submission formatting, and unused row styles were removed from the form.
- Newly added ingredient and step inputs request native autofocus on mount. Initial rows use ID zero and do not request autofocus; stable keys preserve existing inputs across rerenders. Removing all rows and adding again still focuses the new input.
- A parameterized form test checks the autofocus prop for both sections. It verifies the native focus request, not actual focus or scrolling. The user verified Android editing, add/remove behavior, multiline steps, alignment, keyboard scrolling, focus and automatic visibility of newly added inputs near the bottom, and adding after removing all rows without unwanted focus changes when removing another row.
- The full mobile suite passed with 242 tests across twenty suites, and TypeScript passed. After removing unused styles, the user confirmed focused tests and TypeScript remained green.
- Shared row UI and autofocus are complete in merged PR #83.
- useFormTextRows now owns editable rows, stable ID allocation, and add/remove/update operations. Ingredients and steps each call the hook independently, preserving separate state and ID counters. Both start with one empty row; IDs remain stable across removal and are not reused.
- RecipeCreateForm retains validation, submission, and payload formatting because ingredients use original_text, steps use instruction, and tips use tip. The extraction preserves shared row rendering and new-input autofocus without adding duplicate hook tests; existing form behavior tests exercise both hook instances.
- The full mobile suite passed with 242 tests across twenty suites, and TypeScript passed. The user verified Android add/edit/remove behavior in both sections, new-row focus and keyboard visibility, and saving a recipe containing ingredients and instructions. The user reviewed independent hook state and the separation between row operations and submission formatting.
- The shared row-state hook is complete in merged PR #84.
- Manual creation now supports repeatable recipe tips using an independent useFormTextRows call and RecipeFormTextRow. The section starts with one empty multiline input and provides add/remove controls, stable IDs, and autofocus for newly added tips. Recipe tips remain separate from future personal notes.
- Submission trims tip text, omits blank rows, preserves internal line breaks, and assigns consecutive positions using the tip field. RecipeCreateRequest accepts optional tips; omission and an empty array both allow recipes without tips.
- New form tests cover ordered tip submission and whitespace/line-break handling. Existing retry, autofocus, navigation, and API tests were extended to cover tips without duplicating shared-row behavior tests.
- The full mobile suite passed with 245 tests across twenty suites, and TypeScript passed. The user verified Android middle-tip removal, removing all tips and adding again, new-tip focus and visibility above the keyboard, trimmed multiline tips in saved order, a hidden detail tips section when empty, and failed-save preservation followed by successful retry.
- The user reviewed independent tip hook state and why the API request field remains optional while the form submits an array. Keep this PR focused on recipe-tip entry; additional creation fields remain separate milestones.
- User preference: retain incremental, test-first development while building toward the intended final interaction. Clarify uncertain product behavior before selecting a temporary shortcut. Ingredients, instructions, and tips should use separate repeatable inputs with add/remove controls rather than a temporary multiline input.
- User preference: keep PRs small and digestible, define scope up front, count test/doc size, and split adjacent features into follow-ups. Separate commits alone do not address oversized PRs; see AGENTS.md.

## UI exploration

Generated three mobile design/wireframe options based on the planned screens.

Core screens:

1. Recipe Library
2. Import Recipe
3. Import Preview / Edit Recipe
4. Manual Recipe Create/Edit
5. Recipe Detail / Cooking View
6. Search / Filter
7. Settings / Account

Decision status:

- Option C is the preferred UI direction, but it has not been formally finalized.
- Mobile-first remains the priority.
- Recipe Detail / Cooking View is the most important screen.
- Import Preview must make scraped recipes feel editable and trustworthy.

## Development philosophy

The project is also for learning Python.

Codex should:

- Explain concepts.
- Help write tests.
- Review code.
- Debug errors.
- Give hints before full solutions.

Codex should not:

- Build the entire app without explanation.
- Skip the learning process.
- Leave important decisions only in chat.

## Memory rule

Any important product, UI, API, data model, architecture, naming, or roadmap decision should be written into the repo docs before moving on.
