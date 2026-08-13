#!/usr/bin/env bash
# Vercel web build for the Flutter frontend.
# Auth0 config is read from Vercel env vars, falling back to dev defaults.
set -e

if [ ! -d ../flutter ]; then
  cd .. && git clone https://github.com/flutter/flutter.git && cd frontend
fi

../flutter/bin/flutter clean
../flutter/bin/flutter build web --release \
  --dart-define=USE_PROD_BACKEND=true \
  --dart-define=AUTH0_DOMAIN="${AUTH0_DOMAIN:-dev-mglpuahc3cwf66wq.us.auth0.com}" \
  --dart-define=AUTH0_CLIENT_ID="${AUTH0_CLIENT_ID:-WxWdn4aInQlttryLO0TYdvheBka8yXX4}" \
  --dart-define=AUTH0_AUDIENCE="${AUTH0_AUDIENCE:-}" \
  --no-tree-shake-icons
