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




## FILMER Feature Development and Debugging — 2026-10-07

**Tool(s) used:**  
ChatGPT, Codex

**What I asked for:**  
I used AI to review and improve FILMER's existing React Native/Expo implementation, focusing on multi-photo sharing, film catalog presentation, roll/film editing, and the photo archive experience. I requested native iOS Share Sheet behavior for selected images, a compact film-selection layout with cover thumbnails, editable film metadata (name, ISO, type, and cover), and consistent behavior when editing a roll. I also discussed organizing Kodak and Fujifilm film-cover assets and catalog records in the project.

**What I kept as-is:**  
I retained FILMER's roll-based workflow, the existing compact film thumbnails, the React Native + Expo architecture, and the separation between film catalog metadata and photos belonging to a roll. I kept the requirement that selecting or sharing photos must preserve their roll order.

**What I changed or rejected, and why:**  
I rejected enlarging film-cover images in the film-selection list because the original compact layout was easier to scan. I requested that tapping the selected film's thumbnail or title open an edit flow resembling the custom-film form, rather than a large detail-only screen. For sharing, I preferred the native iOS Share Sheet rather than a custom sharing interface. I also requested consistent film-cover artwork and metadata for Kodak and Fujifilm entries.

**Something the AI got wrong that I had to catch:**  
The proposed UI initially enlarged the film artwork even though I wanted to preserve the existing layout. Sharing multiple photos also encountered an environment limitation: Expo Go lacked the native RNShare module, so a native development build was needed to validate that workflow. I learned not to treat simulator/build success as proof that sharing works on a physical iPhone.

**One decision I can explain without AI:**  
Film metadata and film-cover artwork should be reusable catalog data, while each Roll stores its own camera, date, notes, and photo references. This avoids duplicating film records and makes later catalog updates easier.

**Verification / remaining work:**  
Confirm the actual code changes and test results in the Git history before marking individual features as complete. Re-test multi-photo sharing in an iOS native build and on a physical device; check that roll editing does not remove attached photos.
## Sprint 01 Planning — 2026-10-08

**Tool(s) used:** ChatGPT

**What I asked for:**  
I asked AI to help convert the Agile Software Engineering homework requirements into a one-week sprint plan for FILMER, including a sprint goal, prioritized product backlog, acceptance checks, tasks, estimates, blockers, and a Definition of Done.

**What I kept as-is:**  
I kept the focus on FILMER's existing MVP workflow: create a roll, import scanned photos, and reopen the archive with saved metadata and photo order.

**What I changed or rejected, and why:**  
I prioritized stability and testing instead of introducing unrelated new features. I will adjust owners, issue labels, and completion statuses to reflect the actual repository and team work.

**Something the AI got wrong that I had to catch:**  
AI cannot verify the current repository's implementation or actual team assignments from the assignment slides alone. I must verify the suggested statuses, estimates, and acceptance checks against the real project before submission.

**One decision I can explain without AI:**  
The sprint prioritizes durable roll creation and photo import because they form FILMER's core user workflow; extra catalog polish can wait until that workflow is reliable.


## FiLog iCloud Sync, Onboarding and Release Hardening — 2026-10-27

**Tool(s) used:**  
Claude Code, Xcode, iOS Simulator, physical iPhone, CloudKit Console

**What I asked for:**  
After setting up my Apple Developer account, I asked how deleting and reinstalling the app would restore data through iCloud, and asked the AI to fix the Sync control, which could not be tapped on my device. I also asked for a first-run guide for importing photos, a short tour of New Roll, Browse, Statistics and Settings, clear messages when sync is turned on, a less plain Settings icon, and shorter Storage information.

**What I kept as-is:**  
The local-first design: rolls are stored on the device and iCloud sync is optional, using the user's private CloudKit database with no developer server. I kept the reference import mode, so photos stay in Apple Photos instead of being copied.

**What I changed or rejected, and why:**  
I asked for the Storage screen to use short labels like the reference screenshot I provided, instead of long explanations. I made the app iPhone-only for the first release and removed the unused camera and microphone permissions so the review questionnaire stays simple.

**Something the AI got wrong that I had to catch:**  
Sync stayed disabled on my iPhone even after I had configured iCloud. The availability check did not follow the entitlements that were actually signed into the build, and the Debug configuration was signed without CloudKit. I reported that the button still could not be pressed, and the fix read the CloudKit environment from the signed entitlements and signed both configurations with them. I confirmed it worked on my device.

**One decision I can explain without AI:**  
Development builds and TestFlight/App Store builds use different CloudKit environments (Development and Production). Data synced from an Xcode build does not appear in the TestFlight build, so the CloudKit schema must be deployed to Production before testing restore with TestFlight.

**Verification / remaining work:**  
Sync and restore were tested on my iPhone with a development build. Restore must be re-tested with the TestFlight build after deploying the schema to Production.


## FiLog Tips, Settings Polish, Legal Pages and Cover Cropping — 2026-10-27

**Tool(s) used:**  
Claude Code, Xcode (StoreKit configuration), GitHub Pages, iOS Simulator

**What I asked for:**  
I did not want to charge for the app, so I asked for a "Support development" tips screen similar to another film app I showed as reference. I asked for privacy policy and support pages hosted on my own GitHub Pages (not the class repository), first plain, then a more colorful and professional site with a header, feature sections and a contact section. I also asked to merge the Privacy and Support rows in Settings with better icons, to give film and camera covers a fixed crop ratio where users can move the crop area, to fix the stuck buttons in Add Camera, and to center the search icon in the film search bar.

**What I kept as-is:**  
The app stays free with every feature unlocked. Tips are four consumable In-App Purchases (StoreKit 2), with prices loaded from the App Store, so they can change without a new build.

**What I changed or rejected, and why:**  
I rejected the first legal pages because they looked too basic, and the dark background looked unprofessional. I chose to publish them from a personal repository so the class repository stays clean, and chose my public contact email and developer name myself.

**Something the AI got wrong that I had to catch:**  
I had to point out several visual details the AI missed: the misaligned search icon, the camera form buttons that touched each other, and Settings icons that looked out of place.

**One decision I can explain without AI:**  
A tip inside an iOS app must use In-App Purchase. Apple keeps 15% under the Small Business Program (otherwise 30%), and the Paid Applications Agreement with bank and tax information must be active. External donation links are not allowed inside the app, and a tip is not a charitable donation.

**Verification / remaining work:**  
A local StoreKit configuration file (`ios/FiLog/FiLog.storekit`) is included for testing purchases in Xcode. Real prices appear only after the Paid Applications Agreement becomes active; a real purchase flow still needs testing in TestFlight.


## FiLog App Store Submission and TestFlight — 2026-10-27

**Tool(s) used:**  
Claude Code, XCUITest, iOS Simulator (iPhone 18 Pro Max), Python (Pillow), App Store Connect, Xcode, TestFlight

**What I asked for:**  
I asked for a complete submission package that I could copy and paste: App Store screenshots, name, subtitle, keywords, descriptions in English, Vietnamese and Korean, privacy answers, review notes and step-by-step instructions. I asked how the in-app tips work if they are paid like an app purchase but meant as a donation. While filling in App Store Connect, I asked what to put in each field, how to create the tip products, and how to take the review screenshot. Finally I asked the AI to archive the app and upload it to TestFlight.

**What I kept as-is:**  
Self-made illustrative photos (generated landscapes) for the sample rolls, so no real or copyrighted photos appear in the screenshots. The data-collection answer "Data Not Collected" and the age rating 4+.

**What I changed or rejected, and why:**  
I rejected the first screenshot frame because it looked like an Android phone, and asked for the iPhone 18 Pro Max look with Dynamic Island. I decided to upload builds to TestFlight while waiting for the paid-apps agreement instead of delaying, because prices come from the App Store and need no code change.

**Something the AI got wrong that I had to catch:**  
- App Store Connect rejected all screenshots with "File dimensions are invalid": the AI produced the 6.9-inch size (1320 × 2868), but the required slot is now "iPhone with Dynamic Island (medium display)" (1206 × 2622).
- The AI first told me to keep the version as 1.0, but the build is 1.0.0. The AI corrected this before submission.
- Apple's processing email rejected build 1 (ITMS-90683, missing NSMotionUsageDescription). The location library links CoreMotion even though FiLog never uses motion data. Build 2 added the purpose string and passed.
- The tip review screenshot could not show prices, because the StoreKit test session did not apply outside Xcode and the App Store returned no products before the agreement was active.

**One decision I can explain without AI:**  
A public TestFlight link only works after Apple's Beta App Review approves an external testing group, while internal testers can install immediately. That is why new users could not join my public link yet.

**Verification / remaining work:**  
Build 1.0.0 (2) is "Complete" in TestFlight. Remaining: activate the Paid Applications Agreement (bank processing and the W-8BEN tax form), deploy the CloudKit schema to Production, retake the tip screenshot with real prices, then submit for App Review. (External beta review was later approved and the public TestFlight link is live.)


## FiLog Photo Flicker Fix and Contact Sheet Appearance — 2026-10-28

**Tool(s) used:**  
Claude Code, iOS Simulator, XCUITest, Node test runner

**What I asked for:**  
I asked for more frame and background choices for contact sheets, including borders that look like real film, and asked the AI to fix all photos occasionally flashing at once.

**What I kept as-is:**  
The rule that every frame style keeps the same sheet size and photo area, so the preview and the exported image always match. Contact sheet preferences are saved separately from roll data.

**What I changed or rejected, and why:**  
Another AI session was already editing the same contact sheet and photo files. When asked, I chose to stop that session and let this one take over its unfinished work, to avoid both sessions overwriting each other.

**Something the AI got wrong that I had to catch:**  
The earlier code reloaded every visible image whenever the Photos library reported any change, such as iCloud Photos syncing or a new photo being taken, which explained the random flashing. Now only edited or deleted photos reload. During the simulator check, two new styles also needed fixes: instant-print borders touched each other and looked like one strip, and the light film strip disappeared on the cream background.

**One decision I can explain without AI:**  
A library change event should be targeted: only references whose asset was edited or deleted lose their pixels; everything else revalidates in place, so the user never sees a blank grid.

**Verification / remaining work:**  
TypeScript, ESLint and 251 tests passed; all 10 frame styles and the new backgrounds were checked in the app on the simulator. The flicker fix still needs confirmation on a physical iPhone with iCloud Photos syncing.


## FiLog Film Picker Index and README — 2026-10-29

**Tool(s) used:**  
Claude Code, iOS Simulator, XCUITest, GitHub

**What I asked for:**  
I asked for an A–Z strip on the film picker so users can drag to a letter and jump to a film brand. I also asked for a README that introduces the app with screenshots and explains how to install it with TestFlight.

**What I kept as-is:**  
The README uses the exact seven screenshots I uploaded to the App Store.

**What I changed or rejected, and why:**  
After trying the A–Z strip, I removed it because it looked cluttered beside the list; it was reverted with a separate commit. I asked to replace the first README images (resized copies and a composite of contact sheet styles) with the original App Store screenshots.

**Something the AI got wrong that I had to catch:**  
In the simulator, jumping to letters far down the list (such as S and U) first stopped at the wrong brand, because the list had not rendered those rows yet. The AI found this while testing and fixed it before I removed the feature.

**One decision I can explain without AI:**  
The README is written in English like the rest of the repository, and the public TestFlight link was added only after Apple approved external testing, so the README never pointed to a link that did not work.

**Verification / remaining work:**  
External testing was approved and the public TestFlight link (https://testflight.apple.com/join/nVkaZtC4) was added to the README.
