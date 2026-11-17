import { describe, it, expect, beforeEach } from 'bun:test';
import { authStorage, api } from './api';

describe('authStorage', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (_i: number) => null,
      length: store.size,
    };
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).window = {
      localStorage: mockStorage,
    };
  });

  it('stores, retrieves, and removes auth tokens correctly', () => {
    expect(authStorage.getToken()).toBeNull();

    authStorage.setToken('test-jwt-token-scholar');
    expect(authStorage.getToken()).toBe('test-jwt-token-scholar');

    authStorage.removeToken();
    expect(authStorage.getToken()).toBeNull();
  });
});

describe('api client endpoints', () => {
  it('has all required API methods defined', () => {
    expect(typeof api.login).toBe('function');
    expect(typeof api.register).toBe('function');
    expect(typeof api.getMe).toBe('function');
    expect(typeof api.listSessions).toBe('function');
    expect(typeof api.getSession).toBe('function');
    expect(typeof api.createSession).toBe('function');
    expect(typeof api.deleteSession).toBe('function');
    expect(typeof api.getMessages).toBe('function');
    expect(typeof api.sendMessage).toBe('function');
    expect(typeof api.streamChat).toBe('function');
    expect(typeof api.checkFlashcardReadiness).toBe('function');
    expect(typeof api.generateFlashcards).toBe('function');
    expect(typeof api.getFlashcards).toBe('function');
    expect(typeof api.generateDiagram).toBe('function');
    expect(typeof api.getDiagrams).toBe('function');
    expect(typeof api.uploadPdf).toBe('function');
    expect(typeof api.ingestYouTube).toBe('function');
  });

  it('formats getPdfUrl correctly with token if present', () => {
    authStorage.setToken('scholar-token-123');
    const url = api.getPdfUrl('session-xyz');
    expect(url).toContain('/ingest/pdf/session-xyz');
    expect(url).toContain('token=scholar-token-123');
    authStorage.removeToken();
  });
});
