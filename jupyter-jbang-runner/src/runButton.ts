import { JupyterFrontEnd } from '@jupyterlab/application';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ITranslator } from '@jupyterlab/translation';
import { ToolbarButton, ICommandPalette } from '@jupyterlab/apputils';
import { runIcon } from '@jupyterlab/ui-components';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import { Terminal } from '@jupyterlab/terminal';

/**
 * A widget extension that adds a run button to file editors
 */
export class RunButtonExtension implements DocumentRegistry.IWidgetExtension<any, any> {
  constructor(
    private app: JupyterFrontEnd,
    private translator: ITranslator
  ) {
    console.log('[jupyter-jbang-runner] RunButtonExtension created');
  }

  createNew(widget: any, context: DocumentRegistry.IContext<any>): IDisposable {
    console.log('[jupyter-jbang-runner] createNew called for:', context.path);
    
    const fileName = context.path.split('/').pop() || '';
    
    // Only add button for .java and .jsh files
    if (!fileName.endsWith('.java') && !fileName.endsWith('.jsh')) {
      console.log('[jupyter-jbang-runner] Not a Java file, skipping:', fileName);
      return {
        dispose: () => {},
        get isDisposed() { return false; }
      };
    }

    console.log('[jupyter-jbang-runner] Adding run button for:', fileName);

    const trans = this.translator.load('jupyter-jbang-runner');
    const runCommand = 'jupyter-jbang-runner:run-file';

    // Create the run button
    const button = new ToolbarButton({
      className: 'jbang-run-button',
      icon: runIcon,
      onClick: async () => {
        console.log('[jupyter-jbang-runner] Run button clicked for:', context.path);
        
        try {
          const command = `jbang run "${context.path}"\n`;
          console.log('[jupyter-jbang-runner] Creating terminal with command:', command);
          
          // Start a new terminal session
          const session = await this.app.serviceManager.terminals.startNew();
          console.log('[jupyter-jbang-runner] ✓ Terminal session started');
          
          // Create a new terminal widget with the session
          const term = new Terminal(session);
          term.id = `jbang-terminal-${session.name}`;
          term.title.label = `JBang: ${context.path.split('/').pop()}`;
          term.title.closable = true;
          
          // Add terminal to shell
          this.app.shell.add(term, 'main', { mode: 'split-bottom' });
          this.app.shell.activateById(term.id);
          console.log('[jupyter-jbang-runner] ✓ Terminal added to shell');
          
          // Send the initial command to the terminal
          session.send({ type: 'stdin', content: [command] });
          console.log('[jupyter-jbang-runner] ✓ Command sent to terminal');
        } catch (error) {
          console.error('[jupyter-jbang-runner] Failed to run file:', error);
        }
      },
      tooltip: trans.__('Run this file with jbang')
    });

    // Add button to toolbar
    widget.toolbar.insertItem(10, 'jbangRun', button);
    console.log('[jupyter-jbang-runner] ✓ Button added to toolbar');

    return button;
  }
}

/**
 * Add a run button to file editors for .java and .jsh files
 */
export function addRunButton(
  app: JupyterFrontEnd,
  docManager: IDocumentManager,
  translator: ITranslator,
  palette: ICommandPalette | null
): void {
  console.log('[jupyter-jbang-runner] Setting up run button functionality');

  const trans = translator.load('jupyter-jbang-runner');

  // Create the widget extension
  const extension = new RunButtonExtension(app, translator);
  
  // Register the extension with the document registry
  const fileTypes = ['java', 'jsh'];
  
  // Try to get widget factory for file editor
  docManager.registry.addWidgetExtension('Editor', extension);
  console.log('[jupyter-jbang-runner] Widget extension registered with Editor factory');

  // Add command for running files
  const runCommand = 'jupyter-jbang-runner:run-file';
  if (!app.commands.hasCommand(runCommand)) {
    app.commands.addCommand(runCommand, {
      label: trans.__('Run with jbang'),
      icon: runIcon,
      execute: async () => {
        console.log('[jupyter-jbang-runner] Run command executed from palette');
        const widget = app.shell.currentWidget;
        if (!widget) {
          console.warn('[jupyter-jbang-runner] No current widget');
          return;
        }

        const context = docManager.contextForWidget(widget);
        if (!context) {
          console.warn('[jupyter-jbang-runner] No context for widget');
          return;
        }

        const filePath = context.path;
        const fileName = filePath.split('/').pop() || '';
        
        if (!fileName.endsWith('.java') && !fileName.endsWith('.jsh')) {
          console.warn('[jupyter-jbang-runner] Not a Java file:', fileName);
          return;
        }

        try {
          const command = `jbang run "${filePath}"\n`;
          console.log('[jupyter-jbang-runner] Creating terminal with command:', command);
          
          // Start a new terminal session
          const session = await app.serviceManager.terminals.startNew();
          console.log('[jupyter-jbang-runner] ✓ Terminal session started');
          
          // Create a new terminal widget with the session
          const term = new Terminal(session);
          term.id = `jbang-terminal-${session.name}`;
          term.title.label = `JBang: ${fileName}`;
          term.title.closable = true;
          
          // Add terminal to shell
          app.shell.add(term, 'main', { mode: 'split-bottom' });
          app.shell.activateById(term.id);
          console.log('[jupyter-jbang-runner] ✓ Terminal added to shell');
          
          // Send the initial command to the terminal
          session.send({ type: 'stdin', content: [command] });
          console.log('[jupyter-jbang-runner] ✓ Command sent to terminal');
        } catch (error) {
          console.error('[jupyter-jbang-runner] Failed to run file:', error);
        }
      }
    });

    // Add to command palette
    if (palette) {
      palette.addItem({
        command: runCommand,
        category: 'File Operations'
      });
    }
  }

  console.log('[jupyter-jbang-runner] Setup complete');
}