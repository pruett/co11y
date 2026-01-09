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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Health check endpoint
 */
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

/**
 * Get all sessions with optional active filter
 */
export async function getSessions(activeOnly?: boolean): Promise<SessionsResponse> {
  const query = activeOnly ? '?active=true' : '';
  return apiFetch<SessionsResponse>(`/api/sessions${query}`);
}

/**
 * Get all projects with optional active filter
 */
export async function getProjects(activeOnly?: boolean): Promise<ProjectsResponse> {
  const query = activeOnly ? '?active=true' : '';
  return apiFetch<ProjectsResponse>(`/api/sessions${query}`);
}

/**
 * Get project detail by ID
 */
export async function getProject(projectId: string): Promise<ProjectDetailResponse> {
  return apiFetch<ProjectDetailResponse>(`/api/projects/${projectId}`);
}

/**
 * Get session detail by ID
 */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  return apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);
}

/**
 * Get paginated transcript for a session
 */
export async function getSessionTranscript(
  sessionId: string,
  limit = 50,
  offset = 0
): Promise<TranscriptResponse> {
  return apiFetch<TranscriptResponse>(
    `/api/sessions/${sessionId}/transcript?limit=${limit}&offset=${offset}`
  );
}

/**
 * Get subagents for a session
 */
export async function getSubagents(sessionId: string): Promise<SubagentsResponse> {
  return apiFetch<SubagentsResponse>(`/api/sessions/${sessionId}/subagents`);
}

/**
 * Get paginated transcript for a subagent
 */
export async function getSubagentTranscript(
  agentId: string,
  limit = 50,
  offset = 0
): Promise<TranscriptResponse> {
  return apiFetch<TranscriptResponse>(
    `/api/subagents/${agentId}/transcript?limit=${limit}&offset=${offset}`
  );
}

/**
 * Get usage statistics
 */
export async function getStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>('/api/stats');
}

/**
 * Get hooks configuration for Claude Code
 */
export async function getHooksConfig(url?: string): Promise<{ hooks: any }> {
  const query = url ? `?url=${encodeURIComponent(url)}` : '';
  return apiFetch<{ hooks: any }>(`/api/hooks/config${query}`);
}
