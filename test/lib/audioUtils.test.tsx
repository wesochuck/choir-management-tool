import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { extractAudioDuration } from '../../src/lib/audioUtils';

let originalAudio: typeof globalThis.Audio;
let originalCreateObjectURL: typeof URL.createObjectURL;
let originalRevokeObjectURL: typeof URL.revokeObjectURL;

beforeEach(() => {
  originalAudio = globalThis.Audio;
  originalCreateObjectURL = URL.createObjectURL;
  originalRevokeObjectURL = URL.revokeObjectURL;
});

afterEach(() => {
  globalThis.Audio = originalAudio;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

function mockAudioEnvironment(duration: number, shouldError = false) {
  const eventMap = new Map<string, () => void>();

  URL.createObjectURL = mock.fn(() => 'blob:test') as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = mock.fn() as unknown as typeof URL.revokeObjectURL;

  globalThis.Audio = class MockAudio {
    src = '';
    duration = duration;

    addEventListener(event: string, handler: () => void) {
      eventMap.set(event, handler);
    }

    removeEventListener(_event: string, _handler: () => void) {
      eventMap.delete(_event);
    }

    load() {
      if (shouldError) {
        const handler = eventMap.get('error');
        if (handler) setTimeout(handler, 0);
      } else {
        const handler = eventMap.get('loadedmetadata');
        if (handler) setTimeout(handler, 0);
      }
    }
  } as unknown as typeof globalThis.Audio;
}

describe('extractAudioDuration', () => {
  it('resolves with rounded duration on loadedmetadata', async () => {
    mockAudioEnvironment(153.7);
    const file = new File(['fake-audio-data'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await extractAudioDuration(file);
    assert.strictEqual(result, 154);
  });

  it('resolves with 0 duration as null', async () => {
    mockAudioEnvironment(0);
    const file = new File(['fake-audio-data'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await extractAudioDuration(file);
    assert.strictEqual(result, null);
  });

  it('resolves with NaN duration as null', async () => {
    mockAudioEnvironment(NaN);
    const file = new File(['fake-audio-data'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await extractAudioDuration(file);
    assert.strictEqual(result, null);
  });

  it('resolves with Infinity duration as null', async () => {
    mockAudioEnvironment(Infinity);
    const file = new File(['fake-audio-data'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await extractAudioDuration(file);
    assert.strictEqual(result, null);
  });

  it('resolves null on error event', async () => {
    mockAudioEnvironment(120, true);
    const file = new File(['fake-audio-data'], 'test.mp3', { type: 'audio/mpeg' });
    const result = await extractAudioDuration(file);
    assert.strictEqual(result, null);
  });

  it('revokes object URL on success', async () => {
    mockAudioEnvironment(120);
    const file = new File(['fake-audio-data'], 'test.mp3', { type: 'audio/mpeg' });
    await extractAudioDuration(file);
    assert.strictEqual(
      (URL.revokeObjectURL as unknown as ReturnType<typeof mock.fn>).mock.callCount(),
      1
    );
  });

  it('revokes object URL on error', async () => {
    mockAudioEnvironment(120, true);
    const file = new File(['fake-audio-data'], 'test.mp3', { type: 'audio/mpeg' });
    await extractAudioDuration(file);
    assert.strictEqual(
      (URL.revokeObjectURL as unknown as ReturnType<typeof mock.fn>).mock.callCount(),
      1
    );
  });
});
