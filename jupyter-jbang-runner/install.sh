#!/bin/bash

# Install the jupyter-jbang-runner extension
echo "Installing jupyter-jbang-runner extension..."

# Install dependencies
npm install --no-prepare

# Build the extension
npm run build:prod

# Install the extension
jupyter labextension install . --no-build

echo "jupyter-jbang-runner extension installed successfully!"
