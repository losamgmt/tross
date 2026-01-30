#!/bin/bash
# Vercel install script for Flutter web

set -e

# Clone Flutter if not present
if [ ! -d "../flutter" ]; then
  cd ..
  git clone https://github.com/flutter/flutter.git -b stable
  cd frontend
fi

# Get dependencies
../flutter/bin/flutter pub get
