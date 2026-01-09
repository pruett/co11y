import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type {
  SessionsResponse,
  ProjectsResponse,
  ProjectDetailResponse,
  SessionDetail,
  TranscriptResponse,
  SubagentsResponse,
  HealthResponse,
  StatsResponse,
} from '@co11y/shared';
import {
  getHealth,
  getSessions,
  getProjects,
  getProject,
  getSessionDetail,
  getSessionTranscript,
  getSubagents,
  getSubagentTranscript,
  getStats,
} from '../lib/api-client';

/**
 * Query keys for React Query cache management
 */
export const queryKeys = {
  health: ['health'] as const,
  sessions: (activeOnly?: boolean) =>
    activeOnly ? (['sessions', 'active'] as const) : (['sessions'] as const),
  projects: (activeOnly?: boolean) =>
    activeOnly ? (['projects', 'active'] as const) : (['projects'] as const),
  project: (projectId: string) => ['projects', projectId] as const,
  sessionDetail: (sessionId: string) => ['sessions', sessionId] as const,
  sessionTranscript: (sessionId: string, limit: number, offset: number) =>
    ['sessions', sessionId, 'transcript', limit, offset] as const,
  subagents: (sessionId: string) => ['sessions', sessionId, 'subagents'] as const,
  subagentTranscript: (agentId: string, limit: number, offset: number) =>
    ['subagents', agentId, 'transcript', limit, offset] as const,
  stats: ['stats'] as const,
};

/**
 * Hook for health check
 */
export function useHealth(): UseQueryResult<HealthResponse, Error> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
  });
}

/**
 * Hook for fetching all sessions
 */
export function useSessions(
  activeOnly?: boolean
): UseQueryResult<SessionsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.sessions(activeOnly),
    queryFn: () => getSessions(activeOnly),
  });
}

/**
 * Hook for fetching all projects
 */
export function useProjects(
  activeOnly?: boolean
): UseQueryResult<ProjectsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.projects(activeOnly),
    queryFn: () => getProjects(activeOnly),
  });
}

/**
 * Hook for fetching project detail
 */
export function useProject(
  projectId: string
): UseQueryResult<ProjectDetailResponse, Error> {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: !!projectId, // Only fetch if projectId is provided
  });
}

/**
 * Hook for fetching session detail
 */
export function useSessionDetail(
  sessionId: string
): UseQueryResult<SessionDetail, Error> {
  return useQuery({
    queryKey: queryKeys.sessionDetail(sessionId),
    queryFn: () => getSessionDetail(sessionId),
    enabled: !!sessionId, // Only fetch if sessionId is provided
  });
}

/**
 * Hook for fetching paginated session transcript
 */
export function useSessionTranscript(
  sessionId: string,
  limit = 50,
  offset = 0
): UseQueryResult<TranscriptResponse, Error> {
  return useQuery({
    queryKey: queryKeys.sessionTranscript(sessionId, limit, offset),
    queryFn: () => getSessionTranscript(sessionId, limit, offset),
    enabled: !!sessionId, // Only fetch if sessionId is provided
  });
}

/**
 * Hook for fetching subagents for a session
 */
export function useSubagents(sessionId: string): UseQueryResult<SubagentsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.subagents(sessionId),
    queryFn: () => getSubagents(sessionId),
    enabled: !!sessionId, // Only fetch if sessionId is provided
  });
}

/**
 * Hook for fetching paginated subagent transcript
 */
export function useSubagentTranscript(
  agentId: string,
  limit = 50,
  offset = 0
): UseQueryResult<TranscriptResponse, Error> {
  return useQuery({
    queryKey: queryKeys.subagentTranscript(agentId, limit, offset),
    queryFn: () => getSubagentTranscript(agentId, limit, offset),
    enabled: !!agentId, // Only fetch if agentId is provided
  });
}

/**
 * Hook for fetching stats
 */
export function useStats(): UseQueryResult<StatsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: getStats,
  });
}
