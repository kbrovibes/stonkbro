#!/bin/bash
# Autonomous backlog loop — re-invokes Claude until done or blocked
# Usage: ./run-backlog.sh

echo "Starting backlog loop..."
rm -f .claude-status

while [ ! -f .claude-status ]; do
  claude --dangerously-skip-permissions --max-turns 60 "/project:work-backlog"

  if [ ! -f .claude-status ]; then
    echo "Session ended without status file. Waiting 5s before next loop..."
    sleep 5
  fi
done

echo ""
echo "=== Backlog loop finished ==="
cat .claude-status
echo ""
