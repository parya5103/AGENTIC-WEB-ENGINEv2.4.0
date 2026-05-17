// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleFirestoreError } from './firebase';

describe('handleFirestoreError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the error and throws it', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Test error');

    expect(() => handleFirestoreError(mockError, 'read', 'users/1')).toThrow(mockError);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Mock DS] Operation read on users/1 failed:',
      mockError
    );
  });

  it('handles null path correctly', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Another error');

    expect(() => handleFirestoreError(mockError, 'write')).toThrow(mockError);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Mock DS] Operation write on null failed:',
      mockError
    );
  });
});
