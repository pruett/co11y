import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HooksSetupWizard } from './HooksSetupWizard';

// Helper to wrap components with QueryClientProvider
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  return {
    ...result,
    rerender: (newUi: React.ReactElement) => {
      result.rerender(<QueryClientProvider client={queryClient}>{newUi}</QueryClientProvider>);
    },
  };
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

describe('HooksSetupWizard', () => {
  const mockOnOpenChange = () => {};

  beforeEach(() => {
    // Mock fetch for hooks config
    global.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString();
      if (urlString.includes('/api/hooks/config')) {
        return new Response(
          JSON.stringify({
            hooks: {
              SessionStart: [
                {
                  matcher: '.*',
                  hooks: [{ type: 'command', command: 'test-command' }],
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={false} onOpenChange={mockOnOpenChange} />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders dialog when open', async () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Setup Claude Code Hooks');
    });
  });

  it('displays setup instructions', async () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Step 1: Copy the configuration');
      expect(container.textContent).toContain('Step 2: Open Claude Code settings');
      expect(container.textContent).toContain('Step 3: Paste the configuration');
      expect(container.textContent).toContain('Step 4: Restart Claude Code');
    });
  });

  it('fetches and displays hooks configuration', async () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('SessionStart');
    });
  });

  it('shows loading state while fetching config', async () => {
    // Mock slow fetch
    global.fetch = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return new Response(JSON.stringify({ hooks: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    // Should show loading state
    await waitFor(() => {
      expect(container.textContent).toContain('Loading configuration');
    });
  });

  it('handles fetch errors gracefully', async () => {
    // Mock failed fetch
    global.fetch = async () => {
      return new Response('Server error', { status: 500 });
    };

    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Failed to fetch hooks configuration');
    });
  });

  it('displays settings file path', async () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('~/.claude/settings.json');
    });
  });

  it('displays helpful notes about requirements', async () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('port 3001');
      expect(container.textContent).toContain('jq');
      expect(container.textContent).toContain('curl');
    });
  });

  it('displays copy button when config is loaded', async () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Copy');
    });
  });

  it('displays Done button', async () => {
    const { container } = renderWithQueryClient(
      <HooksSetupWizard open={true} onOpenChange={mockOnOpenChange} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Done');
    });
  });
});
