#!/bin/bash
# Vercel build script for Flutter web

set -e

# Clone Flutter if not present
if [ ! -d "../flutter" ]; then
  cd ..
  git clone https://github.com/flutter/flutter.git -b stable
  cd frontend
fi

# Print version for debugging
../flutter/bin/flutter --version

# Clean and build
../flutter/bin/flutter clean
../flutter/bin/flutter build web --release \
  --web-renderer canvaskit \
  --dart-define=USE_PROD_BACKEND=true \
  --no-tree-shake-icons
