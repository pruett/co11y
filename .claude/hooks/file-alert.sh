#!/bin/bash
# Alert Claude when progress.txt is modified

WATCH_FILE="$CLAUDE_PROJECT_DIR/progress.txt"

# Read JSON from stdin and extract file path
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Check if the modified file matches our target
if [ "$file_path" = "$WATCH_FILE" ]; then
  echo "ALERT: The file progress.txt was just modified. Please review the changes."
fi

exit 0
