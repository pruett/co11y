import { useState } from 'react';
import { Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getHooksConfig } from '@/lib/api-client';

interface HooksSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HooksSetupWizard({ open, onOpenChange }: HooksSetupWizardProps) {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch config when dialog opens
  const fetchConfig = async () => {
    if (config) return; // Already fetched

    setLoading(true);
    setError(null);

    try {
      const response = await getHooksConfig();
      setConfig(JSON.stringify(response, null, 2));
    } catch (err) {
      setError('Failed to fetch hooks configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch config when dialog opens
  if (open && !config && !loading && !error) {
    fetchConfig();
  }

  const handleCopy = async () => {
    if (!config) return;

    try {
      await navigator.clipboard.writeText(config);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Claude Code Hooks</DialogTitle>
          <DialogDescription>
            Configure Claude Code to send real-time events to this dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Step 1: Copy the configuration</h3>
            <p className="text-sm text-muted-foreground">
              Click the button below to copy the hooks configuration to your clipboard.
            </p>

            {loading && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Loading configuration...</p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                <p className="text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setError(null);
                    fetchConfig();
                  }}
                >
                  Retry
                </Button>
              </div>
            )}

            {config && (
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-[300px]">
                  <code>{config}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Step 2: Open Claude Code settings</h3>
            <p className="text-sm text-muted-foreground">
              Open your Claude Code settings file located at:
            </p>
            <code className="block bg-muted p-2 rounded text-xs">
              ~/.claude/settings.json
            </code>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Step 3: Paste the configuration</h3>
            <p className="text-sm text-muted-foreground">
              Paste the copied configuration into your <code className="bg-muted px-1 py-0.5 rounded">settings.json</code> file.
              If there's already a <code className="bg-muted px-1 py-0.5 rounded">"hooks"</code> section, merge the configurations.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Step 4: Restart Claude Code</h3>
            <p className="text-sm text-muted-foreground">
              Restart Claude Code for the changes to take effect. The dashboard will start receiving real-time events.
            </p>
          </div>

          <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-4 rounded-lg space-y-2">
            <p className="text-sm font-semibold">Note:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Make sure the dashboard backend is running on port 3001</li>
              <li>Both <code className="bg-blue-500/20 px-1 py-0.5 rounded">jq</code> and <code className="bg-blue-500/20 px-1 py-0.5 rounded">curl</code> must be installed</li>
              <li>Events will appear in the activity indicator in the header</li>
            </ul>
          </div>

          <div className="flex justify-between items-center pt-4">
            <a
              href="https://docs.anthropic.com/en/docs/claude-code/hooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Learn more about hooks
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
