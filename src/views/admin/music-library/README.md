# Music Library Architecture

This directory contains the modular implementation of the Music Library management area.

## Architecture Overview

The Music Library follows a strict separation of concerns to ensure testability and maintainability.

### 1. Domain Types (`src/types/musicLibrary.ts`)
Standard TypeScript interfaces for `MusicPiece` and `MusicPieceInput`. These are the single source of truth for the piece data model.

### 2. Pure Utilities (`src/lib/music/*.ts`)
Stateless, pure functions that handle business logic, data transformation, and formatting.
- `applicability.ts`: Section-bucket filtering rules.
- `csv.ts`: Import/Export logic.
- `duration.ts`: Time math and formatting.
- `duplicates.ts`: Detection algorithms.
- `libraryRows.ts`: Complex hierarchical sorting and grouping logic for the library table.
- `metadata.ts`: Inheritance and validation rules.
- `recommendations.ts`: Voice part to audio track matching logic.

### 3. Service Layer (`src/services/musicLibraryService.ts`)
Minimal wrapper around the PocketBase JS SDK for direct CRUD operations (Get, Create, Update, Delete, Bulk).

### 4. Workflow Layer (`src/services/musicLibraryWorkflows.ts`)
Multi-step orchestration logic (e.g., creating a piece with movements and uploading initial audio) that coordinates between the service and utilities.

### 5. UI Components (`src/views/admin/music-library/`)
React presentational and container components.
- `MusicLibraryTable.tsx`: Main data grid.
- `MusicLibraryFilters.tsx`: Search and filtering controls.
- `MusicPieceModal.tsx`: The primary editor for pieces and movements.
- `LearningTracksEditor.tsx`: Audio track management and drag-and-drop.
- `FloatingAudioPlayer.tsx`: Global playback indicator.

## Testing Strategy

- **No PocketBase Required:** Unit tests for utilities, workflows, and hooks should never require a running PocketBase instance. Use mocks for the SDK.
- **TDD:** New logic should be implemented using Test-Driven Development (Red-Green-Refactor).
- **Location:** Unit tests are located in the `test/` directory.

## Future Development

When adding new features:
1. Update types if the schema changes (and add a PocketBase migration).
2. Implement pure logic in `src/lib/music/` with accompanying tests.
3. Integrate into UI components.
