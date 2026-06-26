#!/bin/bash
# Auto-sync: если локальный main отстает от remote — подтянуть
cd /home/z/my-project
CURRENT=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git ls-remote origin main 2>/dev/null | awk '{print $1}')
if [ "$CURRENT" != "$REMOTE" ] && [ -n "$REMOTE" ]; then
  echo "$(date): Syncing $CURRENT -> $REMOTE"
  git fetch origin 2>/dev/null
  git checkout main 2>/dev/null
  git reset --hard origin/main 2>/dev/null
  git checkout spa-mvp 2>/dev/null
  git reset --hard origin/spa-mvp 2>/dev/null
  git checkout main 2>/dev/null
  bun install 2>/dev/null
  bun run db:generate 2>/dev/null
  bun run db:push 2>/dev/null
  # Don't re-seed if data exists
  pkill -f "next dev" 2>/dev/null
  sleep 2
  (bun run dev > /dev/null 2>&1 &)
  echo "$(date): Sync complete, dev server restarted"
fi
