import fs from 'node:fs';
import path from 'node:path';
import type { MusicPiece } from '../src/services/musicLibraryService';
import type { SectionDef } from '../src/services/settingsService';
import type { Event } from '../src/services/eventService';

/**
 * Reusable recursive file scanner.
 */
export function getFilesRecursively(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...getFilesRecursively(filePath, extensions));
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Helper to get all source files with specific extensions.
 */
export function getSrcFiles(extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const srcDir = path.resolve(import.meta.dirname || __dirname || '.', '../src');
  return getFilesRecursively(srcDir, extensions);
}

/**
 * Helper to resolve a path relative to the project root.
 */
export function resolveProjectPath(relativePath: string): string {
  return path.resolve(import.meta.dirname || __dirname || '.', '..', relativePath);
}

/**
 * Fixture creator for MusicPiece objects.
 */
export function createMusicPieceFixture(overrides: Partial<MusicPiece> = {}): MusicPiece {
  return {
    id: 'piece-' + Math.random().toString(36).substr(2, 9),
    title: 'Default Piece Title',
    collectionId: 'pbc_music_library_001',
    collectionName: 'musicLibrary',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...overrides
  } as MusicPiece;
}

/**
 * Fixture creator for Event objects.
 */
export function createEventFixture(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-' + Math.random().toString(36).substr(2, 9),
    collectionId: 'pbc_events_001',
    collectionName: 'events',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    title: 'Default Event Title',
    date: new Date().toISOString(),
    type: 'Performance',
    details: 'Default Event Details',
    parentPerformanceId: '',
    ...overrides
  } as Event;
}

/**
 * Fixture creator for SectionDef objects.
 */
export function createSectionDefFixture(overrides: Partial<SectionDef> = {}): SectionDef {
  return {
    code: 'S',
    name: 'Sopranos',
    allowedVoiceParts: ['S1', 'S2'],
    ...overrides
  };
}

