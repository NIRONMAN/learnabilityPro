export interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: User;
}

export interface StudySession {
  id: string;
  userId: string;
  title?: string;
  sessionType: 'LEARN' | 'REVISE' | 'FLASHCARD' | 'DIAGRAM';
  contextType: 'PDF' | 'YOUTUBE' | 'TOPIC';
  sourceUrl?: string;
  contextText?: string;
  hasVectorStore?: boolean;
  suggestedQuestions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface Flashcard {
  question: string;
  answer: string;
  hint?: string;
}

export interface FlashcardDeck {
  topic: string;
  cards: Flashcard[];
}

export interface Diagram {
  id: string;
  sessionId: string;
  diagramType: string;
  title: string;
  mermaidCode: string;
  explanation: string;
  createdAt: string;
}

export interface IngestResponse {
  sessionId: string;
  title: string;
  chunkCount: number;
  summary: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/api';

export const authStorage = {
  getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
  setToken: (token: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('token', token);
  },
  removeToken: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('token');
  },
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      authStorage.removeToken();
    }
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || errorBody.message || 'API request failed');
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<User>('/auth/me'),

  // Sessions
  listSessions: () => request<StudySession[]>('/sessions'),
  getSession: (id: string) => request<StudySession>(`/sessions/${id}`),
  createSession: (data: {
    title?: string;
    sessionType: string;
    contextType: string;
    sourceUrl?: string;
    contextText?: string;
  }) => request<StudySession>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  deleteSession: (id: string) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),

  // Chat
  getMessages: (sessionId: string) => request<ChatMessage[]>(`/chat/${sessionId}/messages`),
  sendMessage: (sessionId: string, message: string) =>
    request<ChatMessage>(`/chat/${sessionId}/send`, { method: 'POST', body: JSON.stringify({ message }) }),

  // Streaming Chat via SSE
  streamChat: async (
    sessionId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ) => {
    const token = authStorage.getToken();
    const url = `${API_BASE}/chat/${sessionId}/stream?message=${encodeURIComponent(message)}${token ? `&token=${token}` : ''}`;
    
    try {
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        if (response.status === 401) {
          authStorage.removeToken();
        }
        throw new Error(`Stream failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No readable stream available');

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5);
            if (data.trim() === '[DONE]') {
              onComplete();
              return;
            }
            if (data) {
              onChunk(data);
            }
          }
        }
      }

      if (buffer.startsWith('data:')) {
        const data = buffer.slice(5);
        if (data.trim() !== '[DONE]' && data) {
          onChunk(data);
        }
      }
      onComplete();
    } catch (err) {
      onError(err);
    }
  },

  // Study Tools
  generateFlashcards: (sessionId: string, topic?: string) =>
    request<FlashcardDeck>(`/study/${sessionId}/flashcards${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`, {
      method: 'POST',
    }),
  getFlashcards: (sessionId: string) => request<FlashcardDeck[]>(`/study/${sessionId}/flashcards`),
  updateMastery: (cardId: string, level: number) =>
    request<void>(`/study/flashcards/${cardId}/mastery?level=${level}`, { method: 'PUT' }),

  generateDiagram: (sessionId: string, prompt?: string) =>
    request<Diagram>(`/study/${sessionId}/diagram${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ''}`, {
      method: 'POST',
    }),
  getDiagrams: (sessionId: string) => request<Diagram[]>(`/study/${sessionId}/diagrams`),

  // Ingestion
  uploadPdf: (file: File, sessionId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('sessionId', sessionId);
    return request<IngestResponse>('/ingest/pdf', { method: 'POST', body: formData });
  },
  ingestYouTube: (data: { url: string; title?: string; sessionId?: string }) =>
    request<IngestResponse>('/ingest/youtube', { method: 'POST', body: JSON.stringify(data) }),
};
