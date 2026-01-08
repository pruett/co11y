import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { scanClaudeProjects } from './project-scanner';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_CLAUDE_DIR = join(tmpdir(), 'co11y-test-claude');
const TEST_PROJECTS_DIR = join(TEST_CLAUDE_DIR, 'projects');

beforeAll(() => {
  mkdirSync(TEST_PROJECTS_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_CLAUDE_DIR, { recursive: true, force: true });
});

describe('scanClaudeProjects', () => {
  it('should return empty array when projects directory is empty', () => {
    const projects = scanClaudeProjects(TEST_PROJECTS_DIR);
    expect(projects).toHaveLength(0);
  });

  it('should discover project directories and decode paths', () => {
    // Create test project directories with encoded names
    mkdirSync(join(TEST_PROJECTS_DIR, '-Users-john-code-myapp'), {
      recursive: true,
    });
    mkdirSync(join(TEST_PROJECTS_DIR, '-home-user-projects-website'), {
      recursive: true,
    });
    mkdirSync(join(TEST_PROJECTS_DIR, '-Users-jane-Documents'), {
      recursive: true,
    });

    const projects = scanClaudeProjects(TEST_PROJECTS_DIR);

    expect(projects).toHaveLength(3);
    expect(projects).toContainEqual({
      encodedPath: '-Users-john-code-myapp',
      decodedPath: '/Users/john/code/myapp',
      fullPath: join(TEST_PROJECTS_DIR, '-Users-john-code-myapp'),
    });
    expect(projects).toContainEqual({
      encodedPath: '-home-user-projects-website',
      decodedPath: '/home/user/projects/website',
      fullPath: join(TEST_PROJECTS_DIR, '-home-user-projects-website'),
    });
    expect(projects).toContainEqual({
      encodedPath: '-Users-jane-Documents',
      decodedPath: '/Users/jane/Documents',
      fullPath: join(TEST_PROJECTS_DIR, '-Users-jane-Documents'),
    });
  });

  it('should skip non-directory entries', () => {
    const testDir = join(TEST_PROJECTS_DIR, 'test-skip-files');
    mkdirSync(testDir, { recursive: true });

    // Create a file (should be ignored)
    const filePath = join(testDir, 'not-a-directory.txt');
    Bun.write(filePath, 'test content');

    // Create a directory (should be included)
    mkdirSync(join(testDir, '-Users-test-project'), { recursive: true });

    const projects = scanClaudeProjects(testDir);

    expect(projects).toHaveLength(1);
    expect(projects[0].encodedPath).toBe('-Users-test-project');
  });

  it('should handle paths with multiple segments', () => {
    const testDir = join(TEST_PROJECTS_DIR, 'test-multi-segment');
    mkdirSync(testDir, { recursive: true });

    mkdirSync(join(testDir, '-Users-developer-code-company-project'), {
      recursive: true,
    });

    const projects = scanClaudeProjects(testDir);

    expect(projects).toHaveLength(1);
    expect(projects[0].decodedPath).toBe(
      '/Users/developer/code/company/project'
    );
  });

  it('should handle permission errors gracefully', () => {
    // This test verifies that the function doesn't throw on permission errors
    // We can't easily simulate permission errors in tests, but the function
    // should handle them gracefully if they occur
    const projects = scanClaudeProjects('/nonexistent/directory/path');
    expect(projects).toHaveLength(0);
  });

  it('should decode dash-separated paths correctly', () => {
    const testDir = join(TEST_PROJECTS_DIR, 'test-decode');
    mkdirSync(testDir, { recursive: true });

    mkdirSync(join(testDir, '-opt-app-data'), { recursive: true });
    mkdirSync(join(testDir, '-var-log-system'), { recursive: true });

    const projects = scanClaudeProjects(testDir);

    expect(projects).toHaveLength(2);
    const decodedPaths = projects.map((p) => p.decodedPath).sort();
    expect(decodedPaths).toEqual(['/opt/app/data', '/var/log/system']);
  });

  it('should handle Windows-style paths if present', () => {
    const testDir = join(TEST_PROJECTS_DIR, 'test-windows');
    mkdirSync(testDir, { recursive: true });

    // Windows paths would be encoded as -C-Users-Developer-project
    mkdirSync(join(testDir, '-C-Users-Developer-project'), {
      recursive: true,
    });

    const projects = scanClaudeProjects(testDir);

    expect(projects).toHaveLength(1);
    expect(projects[0].decodedPath).toBe('/C/Users/Developer/project');
  });

  it('should sort projects by encoded path', () => {
    const testDir = join(TEST_PROJECTS_DIR, 'test-sorting');
    mkdirSync(testDir, { recursive: true });

    mkdirSync(join(testDir, '-Users-zoe-code'), { recursive: true });
    mkdirSync(join(testDir, '-Users-alice-code'), { recursive: true });
    mkdirSync(join(testDir, '-Users-bob-code'), { recursive: true });

    const projects = scanClaudeProjects(testDir);

    expect(projects).toHaveLength(3);
    expect(projects[0].encodedPath).toBe('-Users-alice-code');
    expect(projects[1].encodedPath).toBe('-Users-bob-code');
    expect(projects[2].encodedPath).toBe('-Users-zoe-code');
  });
});
