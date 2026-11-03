# Cloud synchronization implementation and cleanup inventory

2026-10-22. Existing user data is not migrated or reset. A tracked diff is preserved in `/private/tmp/filmer-before-cloud-cleanup.patch`; current Settings files (including untracked files) are archived in `/private/tmp/filmer-settings-before-cloud-cleanup.tgz`.

## Removal inventory

- Main Settings: remove standalone Photo Quality, Photos Access, Sync Status and Data & Recovery rows. Retain language/appearance/privacy/support and the single Sync Photos entry.
- Remove the four redundant detail-screen implementations and route cases. Old links redirect safely to Settings; working quality preference/Viewer behavior, Photos permission service and recovery services remain.
- Storage: remove oversized summary, duplicate total, nested quality section, long backup text and action submenu. Keep compact measured categories, cloud information, deletion information, safety and a confirmed cache action. Keep quality selection within the existing App Settings row rather than creating another screen.
- Sync Photos: replace repeated count rows and permission subsection with three actual summary values, scan action and contextual affected-frame actions.
- Remove Settings-only styles/translations no longer referenced after rewriting. No blind Git revert, repositories/files/originals deletion, or unrelated UI cleanup.

## Architecture

Existing local repositories stay authoritative and retain validation, optimistic byte guards, envelope compatibility and recovery mode. Cloud changes enter through guarded store methods, never direct raw archive replacement. A separate versioned SQLite KV journal keeps field-level logical clocks, durable pending changes, permanent tombstones, account binding, zone token and a staged projection before applying cloud merges. Crash recovery replays that projection before tracking more local edits. No empty-cloud snapshot can erase local records. No destructive database migration is needed.

CloudKit uses a private custom zone and incremental zone changes (supported by the existing iOS 16.4 target), with record change-tag compare-and-save. Each Roll, frame, custom Film and custom Camera is independent. Concurrent field edits converge deterministically; deletion wins permanently for a stable ID. Frame order is a deterministic merge of per-frame order values; concurrent reorders may interleave, but frames are not discarded. Built-in catalogs ship in the app; custom entries and Roll snapshots sync. Originals, local paths, covers and legacy Copy bytes are not uploaded. Missing Copy data remains a placeholder on another device; covers are expressly excluded from protection claims.

Account identity is checked before remote work. Account changes pause the existing journal instead of uploading one account's library into another. Signed-out/network/quota errors leave local data and pending changes intact. Enabling/disabling never clears local data or pending journal entries. Startup/foreground restore merges validated remote entities; photo reference repair uses the existing PHCloudIdentifier service. Metadata sync and unresolved photos are separate states, never a blanket restore success.

Provisioning the container, enabling the capability on the registered App ID, creating/deploying the schema and validating two signed devices require the user's Apple Developer account. Source configuration is reviewable; unsigned builds cannot establish a working CloudKit account or production schema. No successful cloud or reinstall-protection claim is made without those tests.

## Final implementation notes

The journal is scoped by native container/environment. Active polling is foreground-only; no background-delivery guarantee. Local metadata preimages are retained before cloud projection changes, including overwritten conflicts; this local history is not a backup. A wire-only reference identity detects Relink changes and may encode the origin asset ID; it is never used for cross-device resolution. Only PhotoKit cloud identifiers support portable automatic remapping.

Provisioning remains explicitly false. Custom covers and Copy bytes are not uploaded. Current verification, exact file inventory and required Apple account/device steps are in [CLOUD_SYNC_QA.md](CLOUD_SYNC_QA.md).

## Removed Settings-only translation keys

`prefsCloudSection`, `prefsLater`, `prefsSyncStatus`, `prefsPhotos`, `prefsQualityBody`, `prefsFull`, `prefsLimited`, `prefsDenied`, `prefsUndetermined`, `prefsAccessBody`, `prefsGrantAccess`, `prefsDataSection`, `prefsRecovery`, `prefsDatabase`, `prefsCache`, `prefsStorageScope`, `prefsCloudBody`, `prefsAppleStorage`, `prefsStorageDirections`, `prefsProtectionBody`, `prefsManagement`, `prefsRepairBody`, `prefsStartCheck`, `prefsRecovered`, `prefsInaccessible`, `prefsRestricted`, `prefsErrors`, `prefsSkipped`, `prefsCheckHelp`, `prefsSyncUnavailable`, `prefsSyncDetails`, `prefsLocalData`, `prefsLocalBody`, `prefsApplePhotos`, `prefsApplePhotosBody`, `prefsBackup`, `prefsBackupBody`, `prefsUninstall`, `prefsUninstallBody`, `prefsManualRepair`, `prefsManualBody`, `prefsMeasuredOnly`, `prefsReferenceRecoveryBody`, `prefsLocalOnlyBody`, `prefsUnresolved`, `storageRollDatabaseBody`, `storagePhotoCacheBody`, `storageAppSettingsBody`, `storageOriginalsNote`, `storageAboutCloud`, `storageAboutCloudBody`, `storagePlannedSync`, `storagePlannedSyncBody`, `storageDeleteCloudBody`, `storageYourPhotosData`, `storageProtectionList`.

## Follow-up checkpoint and cleanup — latest Storage request

Checkpoint before revision: `/private/tmp/filmer-storage-20261022/checkpoint.tgz` and `workspace.patch`. The lower Storage layout retains one card per required section; no tab-navigation redesign is introduced. Replace the misleading unconditional success marker with neutral information; remove six now-unused Settings-only translation keys and obsolete success styling. Keep all functional storage/cache/quality/PhotoKit/cloud repositories and data.

Additive cloud Roll `frameIDs` membership detects incomplete frame uploads before projecting a fresh library. First-install UI reports actual received records and validation/paused status. No local migration or reset. See current [implementation/QA report](CLOUD_SYNC_QA.md).
