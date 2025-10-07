import { JupyterFrontEnd } from '@jupyterlab/application';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ITranslator } from '@jupyterlab/translation';
import { ToolbarButton, ICommandPalette } from '@jupyterlab/apputils';
import { runIcon } from '@jupyterlab/ui-components';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';

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
          // Create a new terminal and run jbang
          const terminal = await this.app.commands.execute('terminal:create-new');
          console.log('[jupyter-jbang-runner] Terminal created:', terminal);
          
          // Wait for terminal session to be established with polling
          const terminalWidget = terminal as any;
          let attempts = 0;
          const maxAttempts = 20; // 10 seconds total
          
          const waitForSession = async (): Promise<boolean> => {
            while (attempts < maxAttempts) {
              attempts++;
              console.log(`[jupyter-jbang-runner] Attempt ${attempts}: Checking for terminal session...`);
              
              if (terminalWidget?.session) {
                console.log('[jupyter-jbang-runner] Terminal session found!');
                return true;
              }
              
              // Wait 500ms before next attempt
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            return false;
          };
          
          const sessionReady = await waitForSession();
          
          if (sessionReady) {
            const command = `jbang run "${context.path}"\n`;
            console.log('[jupyter-jbang-runner] Sending command:', command);
            
            try {
              // Method 1: Use the session's send method
              terminalWidget.session.send({
                type: 'stdin',
                content: [command]
              });
              console.log('[jupyter-jbang-runner] ✓ Command sent via session.send');
            } catch (sendError) {
              console.error('[jupyter-jbang-runner] Session send failed:', sendError);
              
              // Method 2: Try the terminal's input method
              try {
                if (terminalWidget.terminal && terminalWidget.terminal.input) {
                  terminalWidget.terminal.input(command);
                  console.log('[jupyter-jbang-runner] ✓ Command sent via terminal.input');
                } else if (terminalWidget.terminal && terminalWidget.terminal.send) {
                  terminalWidget.terminal.send(command);
                  console.log('[jupyter-jbang-runner] ✓ Command sent via terminal.send');
                } else {
                  console.error('[jupyter-jbang-runner] No terminal input method available');
                }
              } catch (terminalError) {
                console.error('[jupyter-jbang-runner] Terminal input failed:', terminalError);
                
                // Method 3: Try to find and use the xterm instance
                try {
                  const xtermElement = terminalWidget.node.querySelector('.xterm');
                  if (xtermElement && (xtermElement as any).terminal) {
                    (xtermElement as any).terminal.send(command);
                    console.log('[jupyter-jbang-runner] ✓ Command sent via xterm.terminal.send');
                  } else {
                    console.error('[jupyter-jbang-runner] No xterm terminal found');
                  }
                } catch (xtermError) {
                  console.error('[jupyter-jbang-runner] XTerm send failed:', xtermError);
                }
              }
            }
          } else {
            console.error('[jupyter-jbang-runner] ❌ Terminal session never became available after', maxAttempts, 'attempts');
            console.log('[jupyter-jbang-runner] Terminal widget structure:', {
              hasWidget: !!terminalWidget,
              hasSession: !!terminalWidget?.session,
              hasTerminal: !!terminalWidget?.terminal,
              widgetKeys: terminalWidget ? Object.keys(terminalWidget) : 'no widget'
            });
            
            // Fallback: Try multiple methods to send the command
            console.log('[jupyter-jbang-runner] Trying fallback methods...');
            const command = `jbang run "${context.path}"\n`;
            
            try {
              // Method 1: Try to find the actual terminal instance
              console.log('[jupyter-jbang-runner] Method 1: Looking for terminal instance...');
              
              // Look for the terminal in different possible locations
              const possibleTerminals = [
                terminalWidget.terminal,
                terminalWidget.content?.terminal,
                terminalWidget.content?.widget?.terminal,
                terminalWidget.widget?.terminal,
                terminalWidget._terminal,
                terminalWidget._content?.terminal
              ];
              
              for (let i = 0; i < possibleTerminals.length; i++) {
                const terminal = possibleTerminals[i];
                if (terminal && typeof terminal.send === 'function') {
                  console.log(`[jupyter-jbang-runner] Found terminal at index ${i}, sending command...`);
                  terminal.send(command);
                  console.log('[jupyter-jbang-runner] ✓ Command sent via terminal.send');
                  return;
                }
              }
              
              // Method 2: Try to find xterm instance in DOM
              console.log('[jupyter-jbang-runner] Method 2: Looking for xterm in DOM...');
              const xtermElements = terminalWidget.node.querySelectorAll('.xterm');
              for (const xtermEl of xtermElements) {
                if ((xtermEl as any).terminal && typeof (xtermEl as any).terminal.send === 'function') {
                  console.log('[jupyter-jbang-runner] Found xterm terminal, sending command...');
                  (xtermEl as any).terminal.send(command);
                  console.log('[jupyter-jbang-runner] ✓ Command sent via xterm.terminal.send');
                  return;
                }
              }
              
              // Method 3: Try to find the actual input element and focus it
              console.log('[jupyter-jbang-runner] Method 3: Looking for input element...');
              const inputElements = terminalWidget.node.querySelectorAll('input, textarea, [contenteditable]');
              for (const inputEl of inputElements) {
                if (inputEl && typeof (inputEl as any).focus === 'function') {
                  console.log('[jupyter-jbang-runner] Found input element, focusing and sending...');
                  (inputEl as any).focus();
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  // Try to set the value directly
                  if (typeof (inputEl as any).value !== 'undefined') {
                    (inputEl as any).value = command;
                    // Trigger input event
                    const inputEvent = new Event('input', { bubbles: true });
                    inputEl.dispatchEvent(inputEvent);
                    console.log('[jupyter-jbang-runner] ✓ Command sent via input.value');
                    return;
                  }
                }
              }
              
              // Method 4: Try to find the terminal canvas and simulate real typing
              console.log('[jupyter-jbang-runner] Method 4: Looking for terminal canvas...');
              const canvas = terminalWidget.node.querySelector('canvas');
              if (canvas) {
                console.log('[jupyter-jbang-runner] Found canvas, focusing and simulating typing...');
                canvas.focus();
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Simulate real keyboard events on the canvas
                for (const char of command) {
                  const keyEvent = new KeyboardEvent('keydown', {
                    key: char,
                    code: char === ' ' ? 'Space' : `Key${char.toUpperCase()}`,
                    bubbles: true,
                    cancelable: true,
                    view: window
                  });
                  
                  canvas.dispatchEvent(keyEvent);
                  
                  // Also try keypress and keyup
                  const keyPressEvent = new KeyboardEvent('keypress', {
                    key: char,
                    bubbles: true,
                    cancelable: true,
                    view: window
                  });
                  canvas.dispatchEvent(keyPressEvent);
                  
                  await new Promise(resolve => setTimeout(resolve, 20));
                }
                console.log('[jupyter-jbang-runner] ✓ Command sent via canvas keyboard events');
                return;
              }
              
              console.error('[jupyter-jbang-runner] ❌ All fallback methods failed');
              console.log('[jupyter-jbang-runner] Terminal widget debug info:', {
                node: terminalWidget.node,
                nodeClasses: terminalWidget.node?.className,
                nodeChildren: terminalWidget.node?.children?.length,
                allElements: terminalWidget.node?.querySelectorAll('*')?.length
              });
              
            } catch (fallbackError) {
              console.error('[jupyter-jbang-runner] Fallback methods failed:', fallbackError);
            }
          }
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
          const terminal = await app.commands.execute('terminal:create-new');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const terminalWidget = terminal as any;
          if (terminalWidget && terminalWidget.session) {
            const command = `jbang run "${filePath}"\n`;
            terminalWidget.session.send({
              type: 'stdin',
              content: [command]
            });
          }
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