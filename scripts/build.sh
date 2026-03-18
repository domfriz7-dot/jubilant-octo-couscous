#!/usr/bin/env bash
# Build script for U&Me
# Usage: ./scripts/build.sh [android|ios]

set -euo pipefail

PLATFORM=${1:-""}

case "$PLATFORM" in
  android)
    echo "Building Android..."
    npx eas build --platform android
    ;;
  ios)
    echo "Building iOS..."
    npx eas build --platform ios
    ;;
  *)
    echo "Building all platforms..."
    npx eas build --platform all
    ;;
esac
