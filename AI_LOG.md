# AI_LOG.md

## FILMER Initial Project Setup — 2026-09-17

**Tool(s) used:**
- ChatGPT
- Codex
- Figma
- Visual Studio Code
- Git / GitHub

**What I asked for:**
- Define the initial concept and MVP scope for FILMER.
- Plan the application structure and main user workflow.
- Design the initial mobile UI/UX in Figma.
- Set up a React Native + Expo + TypeScript project.
- Prepare the project for iOS development and testing.
- Connect and commit the project to GitHub Classroom.

**What I kept as-is:**
- React Native + Expo + TypeScript as the main technology stack.
- The Film → Roll → Photos data structure.
- The initial FILMER UI/UX direction created in Figma.

**What I changed or rejected, and why:**
- Rejected the first Expo dependency configuration because the package versions were incompatible.
- Updated the project dependency setup to use compatible Expo SDK versions.
- Kept the project focused on the FILMER MVP instead of adding non-essential features at this stage.
- Kept the UI focused on the main workflow: creating a roll, selecting film and camera, adding photos, and viewing the roll.

**Something the AI got wrong that I had to catch:**
- The AI initially provided incompatible Expo package versions.
- This caused npm ERESOLVE dependency errors involving expo-router, expo-constants, and expo-linking.
- I identified the dependency conflicts from the npm error messages and corrected the setup instead of using --force or --legacy-peer-deps.
