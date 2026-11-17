import { describe, it, expect } from 'bun:test';
import { queryKeys } from './queries';

describe('TanStack Query Keys Factory', () => {
  it('generates consistent, typed query keys', () => {
    expect(queryKeys.auth.me).toEqual(['auth', 'me']);
    expect(queryKeys.sessions.all).toEqual(['sessions']);
    expect(queryKeys.sessions.detail('session-123')).toEqual(['sessions', 'session-123']);
    expect(queryKeys.messages.bySession('session-123')).toEqual(['messages', 'session-123']);
    expect(queryKeys.flashcards.bySession('session-123')).toEqual(['flashcards', 'session-123']);
    expect(queryKeys.flashcards.readiness('session-123')).toEqual(['flashcards', 'readiness', 'session-123']);
    expect(queryKeys.diagrams.bySession('session-123')).toEqual(['diagrams', 'session-123']);
    expect(queryKeys.pdfStatus.bySession('session-123')).toEqual(['pdfStatus', 'session-123']);
  });

  it('ensures distinct session IDs generate isolated query keys', () => {
    const keyA = queryKeys.sessions.detail('session-A');
    const keyB = queryKeys.sessions.detail('session-B');
    expect(keyA).not.toEqual(keyB);
  });
});
