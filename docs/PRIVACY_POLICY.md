# FiLog Privacy Policy

Draft for FiLog v1.0 — prepared 2026-10-25. Before publishing, the developer must replace the contact placeholder, identify the responsible developer and set the effective date. This draft is not yet a public policy URL.

## About FiLog

FiLog helps you organize film rolls and link scanned photographs from Apple Photos. FiLog does not require a FiLog account. The current application includes no advertising or third-party analytics service. FiLog can use Apple's iCloud services to synchronize metadata when available and enabled.

## Information stored on your device

FiLog stores roll details, film and camera selections, dates, notes, lab information, optional shooting locations, photo links and frame order. It also stores custom film/camera details, selected cover images, preferences and temporary photo previews. Existing app-owned photo copies, if present, remain in the app's local storage. Local troubleshooting history can retain earlier metadata values after synchronization changes; deleting a roll is not a promise that every historical local copy is immediately erased.

## Photos and permissions

FiLog requests Photos access when you add or repair photo links. You can choose limited or full access and change access in iOS Settings. Limited access may prevent FiLog from finding photos outside your selection. New roll imports link to Apple Photos originals rather than uploading or duplicating those originals into FiLog's iCloud database. FiLog creates temporary previews for display and files for sharing/export. Selecting a custom cover copies that image into app storage.

Removing a roll or frame from FiLog does not delete its original from Apple Photos. If you remove an original or revoke access, its link may no longer display an image. FiLog requests permission to save an exported contact sheet to Photos when you choose that action.

## Optional locations

When you choose to use your current location, FiLog requests foreground location permission. Saved coordinates, location names and addresses can be attached to rolls or frames. Map display, address search and geocoding use system/platform services, which may process the map area, coordinates or search terms needed to provide those features. You can enter/select a location without granting background location access; FiLog does not request background location tracking.

## iCloud synchronization and recovery

When iCloud Sync is enabled and supported by the signed app and your Apple Account, FiLog transmits roll and custom catalog metadata, notes, dates, locations, photo identifiers/links and frame order to your private CloudKit database. FiLog stores sync checkpoints, conflict information and an account identifier locally to avoid mixing libraries. Synchronization occurs while the app is active and when it returns to the foreground; changes may remain pending offline or after an error.

FiLog does not upload original photo files, app-owned photo copy bytes or custom cover images to that database. Apple Photos and iCloud Photos manage originals separately. Photo links are not photo backups. Recovery can only use metadata that successfully synchronized beforehand, with the same Apple Account and compatible FiLog cloud configuration. Finding linked originals also requires matching Photos identifiers, available originals and permission. Recovery is not guaranteed. Device backups managed by Apple are separate from FiLog metadata sync.

## Sharing and external services

Photos and contact sheets are shared only when you select a share/export action. The destination app or service you choose handles the shared content under its own practices. Exported images may contain image metadata; review sensitive content and locations before sharing. Opening support or policy links uses the browser or destination app.

FiLog uses React Native, Expo, Zustand and native libraries for local storage, interface, maps, image selection, sharing and rendering. No standalone advertising or analytics backend is configured in the reviewed v1.0 code. Apple operates Photos, iCloud/CloudKit, Maps and App Store/TestFlight diagnostics; these system services are governed by Apple's terms and privacy practices. Any diagnostic information you choose to send to support will be used to investigate your request. Do not send originals or an archive unless you intend to share its contents.

## Retention and control

You can edit or remove rolls and frames, manage Photos/location permissions and turn off iCloud Sync in Settings. Turning sync off stops future sync; it does not remove previously synced cloud data. Synced deletions may affect other devices. Cloud sync retains deletion markers to prevent deleted records from returning; it is not an immutable backup. Local review history may retain prior metadata for recovery purposes.

Deleting the app can remove local data, covers and app-owned photo files. It does not delete originals in Apple Photos or necessarily delete previously synchronized iCloud data. To manage cloud data, consult iOS Settings > your Apple Account > iCloud > storage management and the available FiLog options. Availability of deletion controls depends on Apple's current interface and configuration. Cloud-data deletion can affect other devices and is not reversible; contact support if you need help understanding your options. FiLog has no separate app account to delete.

## Security and changes

FiLog relies on iOS app storage protections and Apple's system cloud services. No system can guarantee complete security or recovery. We will update this policy if FiLog's data practices change; the published page will identify its effective date.

## Contact

Developer: [DEVELOPER NAME — replace before publication]

Privacy and support contact: [CONTACT EMAIL OR SUPPORT FORM — replace before publication]

Effective date: [SET WHEN PUBLISHED]
