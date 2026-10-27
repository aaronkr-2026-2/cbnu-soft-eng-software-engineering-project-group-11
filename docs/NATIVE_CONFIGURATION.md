# FiLog native configuration ownership

FiLog intentionally maintains its checked-in `ios/` project. It contains a scene-aware AppDelegate, Xcode signing settings, Podfile configuration and local Expo module autolinking. Treat it as maintained native source, not disposable Prebuild output. This policy documents the existing architecture; no project regeneration was performed.

Expo Doctor 1.20.4 reports the non-CNG app-config synchronization warning. It remains visible (no exclusion/ignore). In this workflow `app.json` config plugins describe desired configuration but do not patch native files during `pod install`, Metro export or `xcodebuild`. See [Expo native generation](https://docs.expo.dev/workflow/continuous-native-generation/) and [config plugins](https://docs.expo.dev/config-plugins/introduction/).

| Configuration | Actual native authority / observed value | Relationship to app.json |
| --- | --- | --- |
| Bundle identity | `ios/FiLog.xcodeproj/project.pbxproj`, com.manhduong2003.filog | Matches ios.bundleIdentifier; future edits require native review |
| Version / build | `ios/FiLog/Info.plist`, 1.0.0 / 1 | Version matches; no ios.buildNumber configured. Hardcoded plist overrides MARKETING_VERSION 1.0 |
| Deployment / devices / signing | Xcode project, iOS 16.4, iPhone+iPad, automatic signing/team | Not set by Metro or package updates; distribution authorization remains unverified |
| Photos permissions | Info.plist read/add descriptions and PHPhotoLibraryPreventAutomaticLimitedAccessAlert=true | Currently matches expo-media-library plugin strings; verifier asserts equality |
| Other permissions | Info.plist foreground location, camera, microphone descriptions | Native descriptions are effective; plugin changes require deliberate manual synchronization. Current strings are English |
| Orientation | Info.plist iPhone portrait+upside-down; iPad also landscape | Broader than app.json portrait. Preserved, explicitly requires supported-device QA |
| Theme | Info.plist Automatic; app UI setting passed to custom native picker | Native behavior currently agrees with automatic config |
| URL scheme | Info.plist CFBundleURLTypes, filog | Matches scheme; AppDelegate forwards linking |
| Icon / splash | Native Images.xcassets and SplashScreen.storyboard | App.json icon file alone does not replace compiled native assets |
| Hermes / modules | Podfile.properties.json, Podfile, Podfile.lock, Expo generated provider | Hermes retained; FiLogPhotos autolinks from modules/filog-photos/expo-module.config.json |
| Android | Checked-in android/ source | App.json Android fields likewise require explicit synchronization; Android build QA outside this iOS task |

Run `npm run check:ios-config` on macOS to compare critical identity/Photos/scheme fields and verify declared module/resources. This is a static consistency guard, not signing, entitlement, privacy or runtime verification. Unsigned arm64 Debug/Release builds verify compile/link only. Future native configuration changes should update the relevant native source and app config deliberately, review the diff, rebuild and test on hardware. Do not run `expo prebuild --clean` over this project as a warning workaround.
