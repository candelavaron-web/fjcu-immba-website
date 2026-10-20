#!/bin/sh
# Writes assets/js/supabase-config.js from the Vercel environment variables.
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in
# Vercel → Project → Settings → Environment Variables.
# If they are not set, the file that is committed to the repo is kept.
set -e

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "No Supabase environment variables found — keeping assets/js/supabase-config.js as committed."
  exit 0
fi

cat > assets/js/supabase-config.js <<CONFIG
/* Generated at build time from the Vercel environment variables.
   The anon key is public by design and protected by row level security. */
window.SUPABASE_CONFIG = {
  url: "$VITE_SUPABASE_URL",
  anonKey: "$VITE_SUPABASE_ANON_KEY"
};
CONFIG

echo "assets/js/supabase-config.js written from environment variables."
