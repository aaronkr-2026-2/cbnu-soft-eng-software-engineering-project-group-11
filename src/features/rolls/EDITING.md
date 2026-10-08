# Editing Rolls

Roll Detail's existing More menu opens `/rolls/[id]/edit`. The route initializes the existing
edit draft from the current Roll and clears it on unmount. `RollInformationScreen` is shared
with creation; Film and Camera Selection write into the edit draft and return without saving.
The map picker starts at saved coordinates. All fields remain draft-only until Save Changes.

Frame count is an optional positive integer independent of imported photos. Existing archives
without it remain readable and show an unset value rather than inferring a count from photos.
The shared form edits it in both modes. Month validation permits future YYYY-MM values.

Dirty comparison covers only editable fields and structured location. Save is disabled for a
clean edit draft. Cancel and native back/removal invoke the same localized discard confirmation.
Navigation to selectors does not remove the form. Successful saves disable the guard and return
to Roll Detail with the existing short confirmation toast. Failed SQLite writes preserve draft
and persisted Roll and allow retry.

The store update keeps the Roll ID, photos array, photo metadata/order, files and unrelated
fields. SQLite commits before UI publication. Home derives groups from the updated store;
new Contact Sheet previews derive headers from the current Roll. No photo cleanup/import runs.

Automated service tests cover isolated prefill/discard, dirty/validation, future dates, mixed
Reference/Copy photo preservation, restart persistence and failed-write atomicity. Native gesture
back confirmation, selector round trips and light/dark screen appearance still need device checks.

Film changes now include a Roll-specific filmOverride. The shared Custom Film form edits the
compact selected-film header's metadata/cover without changing the catalog. These changes stay
in the draft until the complete Roll edit is saved. Cancel discards pending overrides and safely
cleans unreferenced owned cover files.
