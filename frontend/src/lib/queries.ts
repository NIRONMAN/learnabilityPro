import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  authStorage,
  User,
  StudySession,
  ChatMessage,
  FlashcardDeck,
  FlashcardReadiness,
  Diagram,
  IngestResponse,
} from './api';

// Type-safe TanStack Query Key Factory
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    detail: (id: string) => ['sessions', id] as const,
  },
  messages: {
    bySession: (sessionId: string) => ['messages', sessionId] as const,
  },
  flashcards: {
    bySession: (sessionId: string) => ['flashcards', sessionId] as const,
    readiness: (sessionId: string) => ['flashcards', 'readiness', sessionId] as const,
  },
  diagrams: {
    bySession: (sessionId: string) => ['diagrams', sessionId] as const,
  },
  pdfStatus: {
    bySession: (sessionId: string) => ['pdfStatus', sessionId] as const,
  },
};

// ---------------------------------------------------------
// Auth Queries & Mutations
// ---------------------------------------------------------
export function useCurrentUser() {
  return useQuery<User | null, Error>({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const token = authStorage.getToken();
      if (!token) return null;
      try {
        return await api.getMe();
      } catch (err) {
        authStorage.removeToken();
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) => api.login(data),
    onSuccess: (res) => {
      authStorage.setToken(res.token);
      queryClient.setQueryData(queryKeys.auth.me, res.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; name?: string }) => api.register(data),
    onSuccess: (res) => {
      authStorage.setToken(res.token);
      queryClient.setQueryData(queryKeys.auth.me, res.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

// ---------------------------------------------------------
// Study Sessions Queries & Mutations
// ---------------------------------------------------------
export function useSessions() {
  return useQuery<StudySession[], Error>({
    queryKey: queryKeys.sessions.all,
    queryFn: () => api.listSessions(),
    enabled: typeof window !== 'undefined' && !!authStorage.getToken(),
  });
}

export function useSession(id: string) {
  return useQuery<StudySession, Error>({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => api.getSession(id),
    enabled: !!id && typeof window !== 'undefined' && !!authStorage.getToken(),
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title?: string;
      sessionType: string;
      contextType: string;
      sourceUrl?: string;
      contextText?: string;
    }) => api.createSession(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.setQueryData(queryKeys.sessions.detail(newSession.id), newSession);
    },
  });
}

export function useDeleteSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.removeQueries({ queryKey: queryKeys.sessions.detail(deletedId) });
    },
  });
}

// ---------------------------------------------------------
// Chat Queries & Mutations
// ---------------------------------------------------------
export function useSessionMessages(sessionId: string) {
  return useQuery<ChatMessage[], Error>({
    queryKey: queryKeys.messages.bySession(sessionId),
    queryFn: () => api.getMessages(sessionId),
    enabled: !!sessionId,
  });
}

export function useSendMessageMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      message: string;
      videoTimestampSec?: number;
      playbackContext?: string;
    }) => api.sendMessage(sessionId, variables.message, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.bySession(sessionId) });
    },
  });
}

// ---------------------------------------------------------
// Flashcards Queries & Mutations
// ---------------------------------------------------------
export function useFlashcards(sessionId: string) {
  return useQuery<FlashcardDeck[], Error>({
    queryKey: queryKeys.flashcards.bySession(sessionId),
    queryFn: () => api.getFlashcards(sessionId),
    enabled: !!sessionId,
  });
}

export function useFlashcardReadiness(sessionId: string) {
  return useQuery<FlashcardReadiness, Error>({
    queryKey: queryKeys.flashcards.readiness(sessionId),
    queryFn: () => api.checkFlashcardReadiness(sessionId),
    enabled: !!sessionId,
  });
}

export function useGenerateFlashcardsMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { topic?: string; force?: boolean; customContext?: string }) =>
      api.generateFlashcards(sessionId, options),
    onSuccess: (newDeck) => {
      queryClient.setQueryData<FlashcardDeck[]>(
        queryKeys.flashcards.bySession(sessionId),
        (old = []) => [newDeck, ...old]
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.readiness(sessionId) });
    },
  });
}

export function useUpdateMasteryMutation() {
  return useMutation({
    mutationFn: ({ cardId, level }: { cardId: string; level: number }) =>
      api.updateMastery(cardId, level),
  });
}

// ---------------------------------------------------------
// Diagrams Queries & Mutations
// ---------------------------------------------------------
export function useDiagrams(sessionId: string) {
  return useQuery<Diagram[], Error>({
    queryKey: queryKeys.diagrams.bySession(sessionId),
    queryFn: () => api.getDiagrams(sessionId),
    enabled: !!sessionId,
  });
}

export function useGenerateDiagramMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prompt?: string) => api.generateDiagram(sessionId, prompt),
    onSuccess: (newDiagram) => {
      queryClient.setQueryData<Diagram[]>(
        queryKeys.diagrams.bySession(sessionId),
        (old = []) => [newDiagram, ...old]
      );
    },
  });
}

// ---------------------------------------------------------
// Ingestion Queries & Mutations
// ---------------------------------------------------------
export function usePdfStatus(sessionId: string) {
  return useQuery<{ hasPdf: boolean; sessionId: string }, Error>({
    queryKey: queryKeys.pdfStatus.bySession(sessionId),
    queryFn: () => api.checkPdfStatus(sessionId),
    enabled: !!sessionId,
  });
}

export function useUploadPdfMutation() {
  const queryClient = useQueryClient();
  return useMutation<IngestResponse, Error, { file: File; sessionId?: string }>({
    mutationFn: ({ file, sessionId }) => api.uploadPdf(file, sessionId),
    onSuccess: (data) => {
      if (data.sessionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.pdfStatus.bySession(data.sessionId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(data.sessionId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useIngestYouTubeMutation() {
  const queryClient = useQueryClient();
  return useMutation<IngestResponse, Error, { url: string; title?: string; sessionId?: string }>({
    mutationFn: (data) => api.ingestYouTube(data),
    onSuccess: (data) => {
      if (data.sessionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(data.sessionId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}
