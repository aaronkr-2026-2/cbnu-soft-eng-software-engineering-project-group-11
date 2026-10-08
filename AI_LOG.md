# AI_LOG.md

## FILMER Initial Project Setup — 2026-09-17

**Tool(s) used:**
- ChatGPT
- Codex
- Figma
- Visual Studio Code
- Git / GitHub
- Expo

**What I asked for:**
- Define the initial concept and MVP scope for FILMER.
- Plan the main application workflow.
- Choose an appropriate cross-platform mobile technology stack.
- Design the initial mobile UI/UX in Figma.
- Set up a React Native + Expo + TypeScript project.
- Prepare the project for iOS development and testing.
- Connect the project to GitHub Classroom.
- Configure Expo and the iOS Simulator development environment.

**What I kept as-is:**
- React Native + Expo + TypeScript as the main technology stack.
- Expo Router as the navigation solution.
- Film → Roll → Photos as the core data structure.
- Figma as the main UI/UX design tool.
- Git and GitHub for version control.
- The minimal photography/archive visual direction for FILMER.

**What I changed or rejected, and why:**
- Rejected the first Expo dependency configuration because several package versions were incompatible.
- Updated the project dependencies to versions compatible with the current Expo SDK.
- Decided to focus on the FILMER MVP rather than adding advanced features at the beginning.
- Kept the first development milestone focused on the main workflow: creating a roll, selecting film and camera, adding photos, and viewing the roll.
- Decided to build the application incrementally instead of connecting authentication, database, and cloud services immediately.

**Something the AI got wrong that I had to catch:**
- The AI initially provided incompatible Expo package versions.
- This caused npm ERESOLVE dependency errors involving expo-router, expo-constants, and expo-linking.
- I identified the dependency conflicts from the npm error messages and corrected the setup instead of using `--force` or `--legacy-peer-deps`.


## FILMER MVP Architecture and Core Workflow — 2026-09-22

**Tool(s) used:**
- ChatGPT
- Codex
- Visual Studio Code
- Expo
- iOS Simulator
- Figma

**What I asked for:**
- Define the core workflow of the FILMER MVP.
- Start converting the initial UI prototype into functional React Native screens.
- Design a maintainable project structure.
- Explain how Expo Router, React components, feature modules, stores, and data models work together.
- Implement navigation between Home, New Roll, Roll Detail, and Settings.
- Prepare the data structures for Film, Camera, Roll, and Photos.
- Design how photos from the iPhone Photos library should be associated with a film roll.
- Explain the code structure so I could understand the React Native and TypeScript architecture instead of only generating code.

**What I kept as-is:**
- React Native + Expo + TypeScript.
- Expo Router for file-based navigation.
- Film → Roll → Photos as the main domain relationship.
- The minimal FILMER visual direction created in Figma.
- Local-first development for the MVP.
- The main workflow:
  Home → New Roll → Roll Detail → Add Photos → View Photos.

**What I changed or rejected, and why:**
- Changed the project from screen-focused development toward feature-based architecture.
- Kept `app/` mainly responsible for routing and screen composition.
- Started separating reusable UI into `src/components/ui/`.
- Started organizing domain logic into feature folders such as Films, Cameras, Rolls, and Photos.
- Separated domain models from individual screens so the data layer can later be replaced with SQLite or cloud synchronization.
- Decided not to connect Supabase immediately because the local workflow should work correctly first.
- Changed the photo architecture after clarifying the purpose of FILMER.
- FILMER should organize scanned film photos that already exist in the user's iPhone Photos library rather than become another primary photo-storage application.
- Planned to store photo references and metadata instead of duplicating image binaries by default.

**Something the AI got wrong that I had to catch:**
- The first photo-import concept treated adding photos too much like copying images into FILMER.
- I clarified that FILMER is primarily an archive manager for scanned film photos already stored in the user's photo library.
- The early architecture placed too much responsibility directly inside screen files.
- Some suggested architecture was more complex than necessary for the current MVP, so database, authentication, and cloud synchronization were postponed.


## FILMER Core Feature Development — 2026-09-29

**Tool(s) used:**
- ChatGPT
- Codex
- Visual Studio Code
- Expo
- iOS Simulator
- Git / GitHub

**What I asked for:**
- Start implementing the main FILMER features.
- Make the Home screen functional.
- Implement the New Roll creation workflow.
- Implement Film selection.
- Implement Camera selection.
- Add support for custom Films.
- Add support for custom Cameras.
- Implement Roll Detail.
- Add photo selection from the user's photo library.
- Display Roll photos in a grid.
- Improve the photo viewing experience.
- Improve the project architecture as the codebase became larger.

**What I kept as-is:**
- React Native + Expo + TypeScript.
- Expo Router.
- Film → Roll → Photos as the domain structure.
- Film and Camera as reusable entities.
- The minimal FILMER design language.
- Local/mock data while the application architecture was still being developed.
- Feature-based organization for new functionality.

**What I changed or rejected, and why:**
- Changed Home from a static prototype into a functional screen with navigation and Roll data.
- Changed Film selection from a few hardcoded buttons into a Film catalog.
- Changed Camera selection from fixed buttons into a Camera catalog.
- Added Custom Film because the built-in catalog cannot contain every film stock a user may use.
- Added Custom Camera for the same reason.
- Designed custom Film and Camera entities so they can later be persisted rather than existing only as display text.
- Changed Roll Detail so photos belonging to the Roll are visible directly in a photo grid.
- Changed photo viewing from a separate page into an overlay on top of Roll Detail.
- Added horizontal swipe behavior to move between Roll photos.
- Started separating screen-specific UI, domain logic, and reusable components.

**Something the AI got wrong that I had to catch:**
- The first New Roll implementation used simple fixed Film and Camera choices and was not scalable.
- The first photo viewer behaved like a separate page, while I wanted the user to remain visually inside Roll Detail.
- Some generated screen files contained too much logic and styling in one file.
- Some early metadata choices did not match the simplified workflow I wanted for a film archive application.


## FILMER UX, Settings and Workflow Development — 2026-09-30

**Tool(s) used:**
- ChatGPT
- Codex
- Visual Studio Code
- Expo
- iOS Simulator
- Git / GitHub

**What I asked for:**
- Redesign the New Roll workflow to make it simpler.
- Make Film selection the first step when creating a Roll.
- Add Custom Film functionality to the Film catalog.
- Add Custom Camera functionality to the Camera catalog.
- Change Roll Date to a month/year wheel selector.
- Allow future years in the Roll Date selector.
- Add a film development Lab field.
- Add shooting Location with map support.
- Improve Roll Detail.
- Allow photos to be reordered using long press and drag.
- Keep Photo Viewer as an overlay and support left/right swiping.
- Add application Settings.
- Add Vietnamese, English, and Korean languages.
- Add Light and Dark appearance settings.
- Add Reference and Copy photo import preferences.
- Add Clear Image Cache.
- Make localization affect the entire application.
- Refactor screen-specific StyleSheet definitions into separate files.
- Fix Settings and Back navigation behavior.

**What I kept as-is:**
- The existing Film, Camera, Roll, and Photo domain structure.
- Expo Router navigation.
- Existing Custom Film and Custom Camera architecture where possible.
- Photo Viewer as an overlay instead of a separate route.
- The local-first architecture.
- The existing theme/design-token system.
- The concept that Roll photos are ordered references associated with a Roll.

**What I changed or rejected, and why:**
- Changed New Roll from one large form into a multi-step workflow:
  Film Selection → Roll Information → Roll Detail.
- This reduces the amount of information shown at once and makes the workflow closer to how users think about creating a film archive entry.
- Changed Film selection into a searchable catalog where the user first selects an existing Film or creates a Custom Film.
- Kept Camera selection inside Roll Information rather than displaying every Camera card on the main New Roll screen.
- Changed Roll Date from an exact calendar date to Month + Year.
- Allowed future years because the Roll date field should not be restricted by the current date.
- Added Lab as optional Roll metadata.
- Added Location as structured map data instead of only a text field.
- Planned Location data around latitude, longitude, name, and address so a saved location can be reopened on a map.
- Added photo reordering so scanned frames can be manually placed in the correct sequence.
- Required photo order to be stored in data rather than being only a temporary visual change.
- Made the Photo Viewer follow the reordered photo sequence.
- Changed localization from a Settings-only feature into an application-wide feature.
- Added Light and Dark themes as application-level settings.
- Kept Reference as the default photo import mode because it matches FILMER's original architecture.
- Added Copy as an optional import preference without pretending that images are copied if the storage implementation is not complete.
- Added Clear Image Cache while keeping Roll data and original photos protected.
- Moved large screen-specific StyleSheet definitions out of route files to make route files easier to read.
- Kept reusable design tokens such as colors, spacing, and typography in the shared theme system.
- Kept Settings as a secondary screen opened from the gear icon rather than a main tab or initial screen.

**Something the AI got wrong that I had to catch:**
- Settings initially called `router.back()` even when no previous navigation route existed.
- This caused the Expo Router warning:
  `The action 'GO_BACK' was not handled by any navigator.`
- I changed the navigation logic so Back uses the previous route when available and falls back to Home when necessary.
- The first localization implementation translated Settings but did not consistently translate the rest of FILMER.
- I changed the requirement so language is global application state.
- Some generated screens continued to use outdated metadata fields after the product requirements changed.
- Large `StyleSheet.create()` blocks continued to be generated inside route files, so I decided to separate screen styles into feature-owned style files.
- Some early New Roll designs became too long as more metadata was added, so I changed the workflow to Film Selection first and a compact Roll Information screen second.

## FILMER Photo Viewer, Roll Cards and TestFlight Preparation — 2026-10-01

**Tool(s) used:**
- Claude Code
- Visual Studio Code
- Expo
- iOS Simulator
- Git / GitHub

**What I asked for:**
- Remove the Frame Count field and show the number of photos in the Roll instead.
- Replace the large "Add Photos" button with a "+" tile after the last photo in the grid.
- Restyle the Home roll cards so each Roll stands out as its own block.
- Improve the Photo Viewer with swipe, pinch-zoom, swipe-to-dismiss, rotate and share.
- Add per-photo details: date taken, location and note.
- Get a step-by-step guide for publishing FILMER to TestFlight for testers.

**What I kept as-is:**
- The Photo Viewer as an overlay on Roll Detail.
- Long press and drag to reorder photos.
- The feature-owned `styles/*.styles.ts` structure.
- Expo EAS as the build and submit path for TestFlight.

**What I changed or rejected, and why:**
- Removed `frameCount` from the Roll model, because the real photo count is more useful than the nominal frame count.
- Changed Roll cards to show the film image, camera, format, month, location and photo count.
- Rebuilt photo gestures with `react-native-gesture-handler` and `react-native-reanimated` so dragging and zooming stay smooth; added haptic feedback when reordering.
- Took the default "date taken" from EXIF but kept it editable.
- Moved all remaining `StyleSheet.create` blocks out of components into separate style files.
- Changed dark mode to an iOS-style palette (true black background).

**Something the AI got wrong that I had to catch:**
- The AI again put `StyleSheet.create` inside component files, against the project's style-file convention, so I moved the styles out.
- The AI used `StyleSheet.absoluteFillObject`, which the installed React Native version does not provide; it was replaced with `StyleSheet.absoluteFill` after the TypeScript check failed.
- The TestFlight guide pointed out that `app.json` still has no `bundleIdentifier`, `eas.json` or app icon, which must be added before the first build.


## Current FILMER Architecture

The current application is organized around the following main domain relationship:

Film
→ Roll
→ Photos

A Roll references a Film and Camera instead of treating their names as unrelated text.

The current Roll concept includes information such as:

- Film
- Camera
- Format
- Frame count
- Month/Year
- Development Lab
- Optional shooting Location
- Notes
- Ordered Photos

The intended Roll creation workflow is:

Home
→ New Roll
→ Select Film
→ Roll Information
→ Create Roll
→ Roll Detail

If the Film does not exist:

Select Film
→ Add Custom Film
→ Select the newly created Film
→ Roll Information

Camera selection supports both built-in and Custom Cameras.

Roll photos can be:

- added from the user's photo library
- displayed in a grid
- reordered
- opened in an overlay viewer
- browsed using horizontal swipe gestures

Application Settings currently include/planned:

- Language: English / Vietnamese / Korean
- Appearance: Light / Dark
- Photo Import: Reference / Copy
- Clear Image Cache

The project continues to follow a local-first approach while keeping the architecture ready for persistent local storage and future cloud synchronization.