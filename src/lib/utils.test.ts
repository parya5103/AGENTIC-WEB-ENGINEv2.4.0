import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges basic classes correctly', () => {
    expect(cn('px-2', 'py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
  });

  it('handles conditional classes', () => {
    expect(cn('px-2', true && 'py-1', false && 'bg-red-500')).toBe('px-2 py-1');
  });

  it('handles objects for conditional classes', () => {
    expect(cn('px-2', { 'py-1': true, 'bg-red-500': false })).toBe('px-2 py-1');
  });

  it('handles arrays of classes', () => {
    expect(cn(['px-2', 'py-1'], ['bg-blue-500'])).toBe('px-2 py-1 bg-blue-500');
  });

  it('resolves Tailwind conflicts (last one wins)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('handles undefined, null, and empty strings gracefully', () => {
    expect(cn('px-2', undefined, null, '', 'py-1')).toBe('px-2 py-1');
  });
});
