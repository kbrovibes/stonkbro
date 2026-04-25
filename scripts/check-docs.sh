#!/bin/bash
# Pre-push hook: warn if src/ changed but docs didn't
# Installed by copying to .git/hooks/pre-push

CHANGED_SRC=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -c "^src/")
CHANGED_README=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -c "^README.md")
CHANGED_DOCS=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -c "^docs/")

if [ "$CHANGED_SRC" -gt 0 ] && [ "$CHANGED_README" -eq 0 ] && [ "$CHANGED_DOCS" -eq 0 ]; then
  echo ""
  echo "  ⚠  src/ changed but README.md and docs/ were not updated."
  echo "  If this is a feature change, consider updating documentation."
  echo "  See scripts/update-docs.md for guidance."
  echo ""
  # Warning only — don't block the push
fi
