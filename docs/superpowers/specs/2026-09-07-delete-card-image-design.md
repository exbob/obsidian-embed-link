# Delete card local image — Design

## Goal

Deleting a web page card also deletes its local preview image file, matching user expectation when “Download images to vault” is used.

## Decisions

- **Shared references:** Always delete the local file; do not scan for other references.
- **Confirm copy:** Mention that an associated local preview image will be removed; remote URLs are unaffected.
- **Remote / data / app URLs:** Skip file deletion.
- **Order:** Attempt image delete first, then remove the embed block. If image delete fails, still remove the block and show a Notice.
- **Cache:** Clear cache entries whose key or string value equals the image path (relative or vault-absolute).

## Behavior

1. User confirms delete.
2. Resolve `data.image` against the note (`sourcePath`) the same way rendering does.
3. If resolved to a vault `TFile`, trash/delete it (prefer `fileManager.trashFile` when available).
4. Clear related cache entries; persist settings if cache changed.
5. Delete the embed fenced block from the note.

## Non-goals

- Orphan sweeping for images not listed on the card
- Changing refresh / copy behavior
