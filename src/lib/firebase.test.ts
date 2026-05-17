import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

import { handleFirestoreError } from './firebase';

describe('handleFirestoreError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw the provided error', () => {
    const error = new Error('Test error');
    expect(() => handleFirestoreError(error, 'testOperation')).toThrow(error);
  });

  it('should log to console.error with the operation and path', () => {
    const error = new Error('Test error');
    try {
      handleFirestoreError(error, 'read', 'users/1');
    } catch (e) {}

    expect(console.error).toHaveBeenCalledWith(
      '[Mock DS] Operation read on users/1 failed:',
      error
    );
  });

  it('should log to console.error with null path', () => {
    const error = new Error('Test error');
    try {
      handleFirestoreError(error, 'read');
    } catch (e) {}

    expect(console.error).toHaveBeenCalledWith(
      '[Mock DS] Operation read on null failed:',
      error
    );
  });
});
