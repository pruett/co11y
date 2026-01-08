import { readFileSync } from 'fs';
import type { TranscriptRecord } from '@co11y/shared';

/**
 * Parses a JSONL (JSON Lines) file and returns an array of TranscriptRecord objects.
 * Each line in the file should contain a valid JSON object representing a transcript record.
 *
 * @param filePath - Absolute path to the .jsonl file
 * @returns Array of parsed TranscriptRecord objects
 * @throws Error if the file cannot be read
 *
 * @remarks
 * - Malformed lines are skipped with a warning logged to console
 * - Empty lines and whitespace-only lines are ignored
 * - The function is synchronous for simplicity
 */
export function parseJsonlFile(filePath: string): TranscriptRecord[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const records: TranscriptRecord[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    try {
      const record = JSON.parse(line) as TranscriptRecord;
      records.push(record);
    } catch (error) {
      // Log warning but continue parsing remaining lines
      console.warn(
        `Warning: Skipping malformed line ${i + 1} in ${filePath}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  return records;
}
