import type { Session, SessionDetail, TranscriptRecord, Subagent } from '@co11y/shared';

export const mockSession: Session = {
  id: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
  project: '/Users/test/code/project',
  projectName: 'project',
  status: 'active',
  lastActivity: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
  messageCount: 15,
  toolCallCount: 8,
  subagentCount: 2,
  model: 'claude-sonnet-4-5-20250929',
  cwd: '/Users/test/code/project',
  gitBranch: 'main',
  slug: 'test-project',
};

export const mockIdleSession: Session = {
  id: '2b3cd4e5-6789-49d0-9f3a-1e66042f963c',
  project: '/Users/test/code/other-project',
  projectName: 'other-project',
  status: 'idle',
  lastActivity: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
  messageCount: 5,
  toolCallCount: 2,
  subagentCount: 0,
  model: 'claude-sonnet-4-5-20250929',
  cwd: '/Users/test/code/other-project',
  gitBranch: 'feature-branch',
  slug: 'other-project',
};

export const mockTranscript: TranscriptRecord[] = [
  {
    type: 'user',
    uuid: 'uuid-1',
    parentUuid: null,
    isSidechain: false,
    sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
    timestamp: Date.now() - 300000,
    cwd: '/Users/test/code/project',
    gitBranch: 'main',
    slug: 'test-project',
    message: {
      role: 'user',
      content: 'Help me write a function to parse JSON',
    },
  },
  {
    type: 'assistant',
    uuid: 'uuid-2',
    parentUuid: 'uuid-1',
    isSidechain: false,
    sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
    timestamp: Date.now() - 290000,
    cwd: '/Users/test/code/project',
    gitBranch: 'main',
    slug: 'test-project',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: "I'll help you write a JSON parser function.",
        },
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'Write',
          input: {
            file_path: '/Users/test/code/project/parser.ts',
            content: 'export function parseJSON(data: string) { return JSON.parse(data); }',
          },
        },
      ],
      model: 'claude-sonnet-4-5-20250929',
      stop_reason: 'tool_use',
    },
    usage: {
      input_tokens: 100,
      output_tokens: 50,
    },
  },
  {
    type: 'user',
    uuid: 'uuid-3',
    parentUuid: 'uuid-2',
    isSidechain: false,
    sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
    timestamp: Date.now() - 280000,
    cwd: '/Users/test/code/project',
    gitBranch: 'main',
    slug: 'test-project',
    message: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tool-1',
          content: 'File written successfully',
        },
      ],
    },
  },
];

export const mockSessionDetail: SessionDetail = {
  ...mockSession,
  transcript: mockTranscript,
};

export const mockSubagents: Subagent[] = [
  {
    agentId: 'a0c831a',
    sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
    task: 'Search for related files in the codebase',
    status: 'completed',
    startTime: new Date(Date.now() - 600000).toISOString(),
    endTime: new Date(Date.now() - 580000).toISOString(),
    messageCount: 10,
    toolCallCount: 5,
    duration: 20000,
  },
  {
    agentId: 'b1d942b',
    sessionId: '1c5be2b5-7887-48c0-8f2a-0e55031f852b',
    task: 'Run tests and verify results',
    status: 'running',
    startTime: new Date(Date.now() - 60000).toISOString(),
    messageCount: 3,
    toolCallCount: 2,
    currentTool: 'Bash',
  },
];
