#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies for all packages
npm install

# Build shared library first if it exists
npm run build -w packages/shared || true

# Explicitly install Puppeteer's Chrome browser
# This ensures the binary is downloaded during the build phase
npx puppeteer browsers install chrome

# (Optional) Build other packages if needed
# npm run build -w packages/api
