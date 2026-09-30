# Roll location

Uses `react-native-maps` 1.27.2 and `expo-location` ~57.0.20, installed with `npx expo install` for Expo SDK 57. Apple Maps is the default iOS provider; no Google API key is needed on iOS. Native address search and reverse geocoding use expo-location.

## Behavior

- `LocationPicker` is a full-screen modal shared by `select` and `view` modes.
- Selection lives in component state. Close cancels; confirmation alone writes the draft.
- Map gestures update a center coordinate. Search results/current location recenter the map. Confirmation waits for map movement to finish, but never requires an address.
- Reverse geocoding is debounced. Request generations prevent late responses from replacing a newer selection or updating a closed modal.
- View mode anchors a marker to the saved coordinates and never writes Roll data.
- Only the current-location button requests foreground permission. No startup permission, tracking, background location, or photo GPS reads.
- Search submits explicitly, rather than issuing a request per keystroke. It is native address geocoding, not a full places/autocomplete database.
- RollLocation is defined once in the existing Roll model. Optional coordinates/name/address pass through the existing draft and Roll store. Session-only Roll persistence is unchanged.

## Native configuration and platform limits

`app.json` adds the expo-location plugin with a when-in-use explanation. Background location, Android foreground services, motion permission, and iOS always-location descriptions are disabled. Rebuild standalone/development binaries to apply native configuration. Expo Go uses its own native permission prompt.

Android standalone builds require a Google Maps API key/configuration before deployment. No key was invented or checked in. Android native geocoding also requires location permission; denied/unavailable search reports a localized error and manual map selection remains available. On iOS, search does not require device-location permission. The native map feature targets iOS/Android, not web.

Map tiles, address availability, and returned address language depend on the native providers/network. FILMER controls and messages support English, Vietnamese, and Korean. Saved addresses are user data and are not retranslated when the app language changes.

Existing in-memory/mock Rolls have no legacy string locations. The dormant database schema's `location TEXT` column was not modified or cleared; a future SQLite Roll repository must serialize the structured location and explicitly handle legacy strings.

## Checks

- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`
- `node scripts/check-location.cjs` (native location calls mocked)
- `node scripts/check-roll-flow.cjs`
- `npx expo config --type public`
- `npx expo install --check` (new dependencies accepted; five pre-existing package patch updates remain)

Simulator smoke check observed a saved location on Vietnamese Roll Detail. Full interactive pan/search/current-location denial/view-mode coverage across languages and themes remains manual.

References: [Expo SDK 57 maps](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/), [Expo SDK 57 location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).
