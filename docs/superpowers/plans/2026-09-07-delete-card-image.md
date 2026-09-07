# Delete card local image — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** On card delete, remove the local preview image and update confirm copy.

**Architecture:** Extract vault image resolve helper; call it from delete + render; add cache cleanup helper.

**Tech stack:** TypeScript, Obsidian API, Vitest.

### Task 1: Helpers + unit tests

- Add `resolveVaultImageFile` (shared) and `clearCacheForImagePaths`.
- Add `deleteLocalEmbedImage` that skips remote URLs and trashes/deletes local files.
- Tests for resolve, skip remote, clear cache.

### Task 2: Wire delete + i18n

- Update `deleteEmbed` to delete image then block; pass `data`.
- Update ZH/EN modal confirm strings.
- Card-action / helper tests; `npm test` + build.
