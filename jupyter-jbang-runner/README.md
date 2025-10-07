# Jupyter JBang Runner

A Jupyter Lab extension that adds a run button to `.java` and `.jsh` files, allowing you to execute them directly with jbang.

## Features

- Adds a run button to the toolbar of `.java` and `.jsh` files
- Executes files using jbang in a new terminal
- Integrates seamlessly with Jupyter Lab's file editor

## Installation

This extension is designed to be installed as part of a Jupyter Binder environment. It will be automatically installed when the postBuild script runs.

## Usage

1. Open a `.java` or `.jsh` file in Jupyter Lab
2. Click the run button (▶️) in the file editor toolbar
3. The file will be executed with jbang in a new terminal

## Development

To build the extension:

```bash
npm install
npm run build
```

To watch for changes during development:

```bash
npm run watch
```
