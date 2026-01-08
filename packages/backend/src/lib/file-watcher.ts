import { watch, FSWatcher } from 'chokidar';
import { join } from 'path';
import { homedir } from 'os';

export type FileChangeCallback = (filePath: string) => void;

/**
 * Creates a file watcher for Claude project directories
 * Watches for changes to .jsonl files and triggers callbacks with debouncing
 */
export function createFileWatcher(
  claudeDir: string = join(homedir(), '.claude', 'projects'),
  callback: FileChangeCallback,
  debounceMs: number = 500
): FSWatcher {
  const debounceTimers = new Map<string, NodeJS.Timeout>();

  const watcher = watch(join(claudeDir, '**/*.jsonl'), {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const debouncedCallback = (filePath: string) => {
    // Clear existing timer for this file
    const existingTimer = debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      debounceTimers.delete(filePath);
      callback(filePath);
    }, debounceMs);

    debounceTimers.set(filePath, timer);
  };

  watcher.on('change', debouncedCallback);
  watcher.on('add', debouncedCallback);

  return watcher;
}
