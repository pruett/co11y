import { describe, it, expect, afterEach } from 'bun:test';
import { createFileWatcher } from './file-watcher';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe.skip('createFileWatcher', () => {
  const testDir = join(tmpdir(), `co11y-file-watcher-test-${Date.now()}`);
  const watchers: any[] = [];

  afterEach(() => {
    // Close all watchers
    watchers.forEach((w) => w.close());
    watchers.length = 0;

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // Helper to wait for watcher to be ready
  async function waitForReady(watcher: any): Promise<void> {
    return new Promise((resolve) => {
      watcher.on('ready', () => resolve());
      // Timeout fallback in case 'ready' event doesn't fire
      setTimeout(resolve, 1000);
    });
  }

  it('should watch for file changes in the directory', async () => {
    mkdirSync(testDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 100);
    watchers.push(watcher);

    // Wait for watcher to be ready
    await waitForReady(watcher);

    // Create a file
    const testFile = join(testDir, 'test-session.jsonl');
    writeFileSync(testFile, '{"type":"user"}\n');

    // Wait for debounce + processing
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]).toBe(testFile);
  });

  it('should watch for new file additions', async () => {
    mkdirSync(testDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 100);
    watchers.push(watcher);

    await waitForReady(watcher);

    // Add a new file
    const newFile = join(testDir, 'new-session.jsonl');
    writeFileSync(newFile, '{"type":"assistant"}\n');

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some((path) => path === newFile)).toBe(true);
  });

  it('should debounce multiple rapid changes to the same file', async () => {
    mkdirSync(testDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 200);
    watchers.push(watcher);

    await waitForReady(watcher);

    const testFile = join(testDir, 'rapid-changes.jsonl');

    // Make multiple rapid changes
    writeFileSync(testFile, '{"type":"user","message":"1"}\n');
    await new Promise((resolve) => setTimeout(resolve, 50));
    writeFileSync(testFile, '{"type":"user","message":"1"}\n{"type":"assistant","message":"2"}\n');
    await new Promise((resolve) => setTimeout(resolve, 50));
    writeFileSync(testFile, '{"type":"user","message":"1"}\n{"type":"assistant","message":"2"}\n{"type":"user","message":"3"}\n');

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Should only trigger callback once due to debouncing
    expect(changes.length).toBe(1);
    expect(changes[0]).toBe(testFile);
  });

  it('should watch files in subdirectories', async () => {
    const projectDir = join(testDir, '-Users-test-project');
    mkdirSync(projectDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 100);
    watchers.push(watcher);

    await waitForReady(watcher);

    const testFile = join(projectDir, 'session.jsonl');
    writeFileSync(testFile, '{"type":"user"}\n');

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]).toBe(testFile);
  });

  it('should only watch .jsonl files', async () => {
    mkdirSync(testDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 100);
    watchers.push(watcher);

    await waitForReady(watcher);

    // Create non-.jsonl file
    const txtFile = join(testDir, 'notes.txt');
    writeFileSync(txtFile, 'some notes\n');

    // Create .jsonl file
    const jsonlFile = join(testDir, 'session.jsonl');
    writeFileSync(jsonlFile, '{"type":"user"}\n');

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should only detect .jsonl file
    expect(changes.length).toBe(1);
    expect(changes[0]).toBe(jsonlFile);
  });

  it('should allow custom debounce time', async () => {
    mkdirSync(testDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 50); // Short debounce
    watchers.push(watcher);

    await waitForReady(watcher);

    const testFile = join(testDir, 'quick-debounce.jsonl');
    writeFileSync(testFile, '{"type":"user"}\n');

    // Wait for shorter debounce
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(changes.length).toBe(1);
  });

  it('should handle multiple files changing simultaneously', async () => {
    mkdirSync(testDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 100);
    watchers.push(watcher);

    await waitForReady(watcher);

    const file1 = join(testDir, 'session-1.jsonl');
    const file2 = join(testDir, 'session-2.jsonl');
    const file3 = join(testDir, 'session-3.jsonl');

    // Create multiple files simultaneously
    writeFileSync(file1, '{"type":"user"}\n');
    writeFileSync(file2, '{"type":"assistant"}\n');
    writeFileSync(file3, '{"type":"user"}\n');

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should detect all three files
    expect(changes.length).toBe(3);
    expect(changes).toContain(file1);
    expect(changes).toContain(file2);
    expect(changes).toContain(file3);
  });

  it('should be closeable', async () => {
    mkdirSync(testDir, { recursive: true });

    const changes: string[] = [];
    const watcher = createFileWatcher(testDir, (filePath) => {
      changes.push(filePath);
    }, 100);
    watchers.push(watcher);

    await waitForReady(watcher);

    // Close the watcher
    await watcher.close();

    // Try to create a file after closing
    const testFile = join(testDir, 'after-close.jsonl');
    writeFileSync(testFile, '{"type":"user"}\n');

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should not detect changes after closing
    expect(changes.length).toBe(0);
  });
});
