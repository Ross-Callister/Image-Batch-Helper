# Image Batch Helper

A desktop app (Electron + React + TypeScript) for quickly sorting, culling, tagging, and organizing large batches of local images.

Built and tested on Windows. The app doesn't rely on Windows-only APIs, so it should run on macOS/Linux via `npm run dev`, but packaging (`build:win`) and testing on those platforms hasn't been done — see [Platform Support](#platform-support).

## Features

- **Drag-and-drop import** — drop image files or whole folders to load them (`.jpg`, `.jpeg`, `.png`, `.webp`)
- **Grid view** with click/shift-click/ctrl-click multi-select and a full-size preview modal (with prev/next navigation)
- **Sorting** by name, last modified, date created, custom drag order, or Elo rating
- **Cull workflow** — mark images for deletion, unmark, then confirm to send them to the Recycle Bin
- **Keep/Toss session** — full-screen one-by-one review (← toss, → keep) with undo, then bulk-delete tossed images or move kept ones to another folder
- **Ranking session** — pairwise comparisons that produce an Elo rating per image, which can be applied as a sort order
- **Tagging** — add/remove tags on selected images, filter the grid by include/exclude tag, tags are stored as sidecar `.txt` files next to each image
- **Batch rename** — rename all currently-visible images to `base-name_001`, `_002`, …
- **Touch** — bulk-update the last-modified timestamp of images
- **Clear view** — remove images from the current view without deleting them from disk

## Tech Stack

- [Electron](https://www.electronjs.org/) via [electron-vite](https://electron-vite.org/)
- React 18 + TypeScript
- [@dnd-kit](https://dndkit.com/) for drag-and-drop / reordering
- electron-builder for packaging (Windows/NSIS)

## Project Structure

```
src/
  main/         Electron main process (window creation, filesystem IPC handlers)
  preload/      Context-bridge API exposed to the renderer
  renderer/     React app (components, Zustand-style store, styles)
```

Key files:
- [src/main/fileOps.ts](src/main/fileOps.ts) — IPC handlers for loading, trashing, touching, renaming, moving images, and saving tag sidecar files
- [src/renderer/src/store.ts](src/renderer/src/store.ts) — application state (selection, sort, cull, tags, ranking, keep/toss)
- [src/renderer/src/App.tsx](src/renderer/src/App.tsx) — top-level layout wiring the store to components

## Getting Started

```bash
npm install
npm run dev      # launch in development with hot reload
```

### Other scripts

```bash
npm run build      # type-check and build for production
npm run start       # preview the built app
npm run build:win   # build and package a Windows installer (NSIS)
```

## Notes

- Tags are persisted as plain-text sidecar files (`image.jpg` → `image.txt`), so they travel with the images if moved outside the app.
- Deletions go through the Recycle Bin/Trash (`shell.trashItem`), not permanent removal.

## Platform Support

Developed and tested on Windows only. Nothing in the codebase is intentionally Windows-only — file paths use Node's `path` module and the custom `localfile://` protocol handler in [src/main/index.ts](src/main/index.ts) falls back to standard POSIX path handling when there's no Windows drive-letter hostname — but macOS/Linux are untested, and `package.json`'s `build` config only defines a `win`/NSIS packaging target. Adding `mac`/`linux` targets to `electron-builder` and verifying behavior there is open work.
