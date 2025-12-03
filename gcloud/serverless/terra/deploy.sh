#!/bin/bash
set -e

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Load environment variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$GCLOUD_PROJECT_ID" ]; then
  echo "Error: GCLOUD_PROJECT_ID is not set in .env"
  exit 1
fi

echo "Building function..."
npm run build

echo "Preparing deployment directory..."
rm -rf .deploy
mkdir -p .deploy

# Copy artifacts
cp -r dist .deploy/
# Copy .env if it exists
if [ -f .env ]; then
  cp .env .deploy/
fi

# Generate production package.json
echo "Generating production package.json..."
node -e '
  const fs = require("fs");
  const pkg = require("./package.json");
  // Remove devDependencies and build scripts to prevent GCF from trying to build
  delete pkg.devDependencies;
  if (pkg.scripts) {
    delete pkg.scripts.build;
    delete pkg.scripts.dev;
  }
  fs.writeFileSync(".deploy/package.json", JSON.stringify(pkg, null, 2));
'

echo "Deploying to Google Cloud Run..."
# You can customize these variables
FUNCTION_NAME="furnarchy-terra-proxy"
REGION="${GCLOUD_REGION:-us-central1}"

# Deploy command
gcloud functions deploy $FUNCTION_NAME \
  --project=$GCLOUD_PROJECT_ID \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=.deploy \
  --entry-point=proxy \
  --trigger-http \
  --allow-unauthenticated

echo "Deployment complete."
