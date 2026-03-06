## Clipboard Favorites Refactor Progress

- Converted clipboard store to favorites-only behavior.
- Removed auto clipboard polling and focus-triggered reads from popup.
- Rewired title-star action to manual clipboard read and add-to-favorites.
- Removed card-level favorite toggle UI and emits from history components.
- Removed history limit settings UI and storage constants.
- Added favorite add success i18n message and filtered legacy non-favorite data.
- Lint check on touched files reports no errors.
- Fixed post-rename import paths (`content.js`, `Excel.vue`, `TranslatePopup.vue`) from `clipboard/useFavorites` to `favorite/useClipboard` variants and validated builds.
