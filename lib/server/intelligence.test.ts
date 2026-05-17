import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getNVIDIA } from './intelligence.ts';

describe('getNVIDIA', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.NVIDIA_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.NVIDIA_API_KEY;
    } else {
      process.env.NVIDIA_API_KEY = originalApiKey;
    }
  });

  test('returns null when NVIDIA_API_KEY is undefined', () => {
    delete process.env.NVIDIA_API_KEY;
    const result = getNVIDIA();
    assert.strictEqual(result, null);
  });

  test('returns null when NVIDIA_API_KEY is less than 10 characters', () => {
    process.env.NVIDIA_API_KEY = 'shortkey';
    const result = getNVIDIA();
    assert.strictEqual(result, null);
  });

  test('returns OpenAI instance when NVIDIA_API_KEY is valid', () => {
    process.env.NVIDIA_API_KEY = 'valid-key-with-more-than-10-chars';
    const result = getNVIDIA();
    assert.notStrictEqual(result, null);
    // Because getNVIDIA caches the instance, we can't easily reset the cached instance
    // without resetting the module. But we can verify it returned an object.
    assert.strictEqual(typeof result, 'object');
  });
});
