import { JupyterFrontEnd } from '@jupyterlab/application';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ITranslator } from '@jupyterlab/translation';
import { ToolbarButton } from '@jupyterlab/apputils';
import { runIcon } from '@jupyterlab/ui-components';

/**
 * Add a run button to file editors for .java and .jsh files
 */
export function addRunButton(
  app: JupyterFrontEnd,
  docManager: IDocumentManager,
  translator: ITranslator
): void {
  const trans = translator.load('jupyter-jbang-runner');

  // Add run command
  const runCommand = 'jupyter-jbang-runner:run-file';
  app.commands.addCommand(runCommand, {
    label: trans.__('Run with jbang'),
    icon: runIcon,
    execute: async (args: any) => {
      const widget = args.widget;
      if (!widget) {
        return;
      }

      const context = docManager.contextForWidget(widget);
      if (!context) {
        return;
      }

      const filePath = context.path;
      const fileName = filePath.split('/').pop() || '';
      
      // Check if file is .java or .jsh
      if (!fileName.endsWith('.java') && !fileName.endsWith('.jsh')) {
        console.warn('File is not a .java or .jsh file');
        return;
      }

      try {
        // Create a new terminal and run jbang
        const terminal = await app.commands.execute('terminal:create-new');
        
        // Wait a bit for terminal to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send the jbang command to the terminal
        const terminalWidget = terminal as any;
        if (terminalWidget && terminalWidget.session) {
          const command = `jbang run "${filePath}"\n`;
          terminalWidget.session.send({
            type: 'stdin',
            content: [command]
          });
        }
      } catch (error) {
        console.error('Failed to run file with jbang:', error);
      }
    }
  });

  // Function to add run button to editor
  function addRunButtonToEditor(widget: any): void {
    const context = docManager.contextForWidget(widget);
    if (!context) {
      return;
    }

    const filePath = context.path;
    const fileName = filePath.split('/').pop() || '';
    
    // Only add button for .java and .jsh files
    if (!fileName.endsWith('.java') && !fileName.endsWith('.jsh')) {
      return;
    }

    // Get the content widget (FileEditor)
    const content = widget.content;
    if (!content) {
      return;
    }

    // Check if button already exists
    const toolbar = (content as any).toolbar;
    if (!toolbar) {
      return;
    }

    const existingButton = toolbar.node.querySelector('[data-command="jupyter-jbang-runner:run-file"]');
    if (existingButton) {
      return;
    }

    // Create and add the run button
    const runButton = new ToolbarButton({
      className: 'jbang-run-button',
      icon: runIcon,
      onClick: () => {
        app.commands.execute(runCommand, { widget: widget });
      },
      tooltip: trans.__('Run this file with jbang')
    });

    // Add the button to the toolbar
    toolbar.addItem('jbang-run', runButton);
  }

  // Listen for new widgets being added
  if (app.shell.currentChanged) {
    app.shell.currentChanged.connect((sender: any, args: any) => {
      const widget = args.newValue;
      if (widget && widget.content) {
        // Wait for the widget to be ready
        setTimeout(() => {
          addRunButtonToEditor(widget);
        }, 100);
      }
    });
  }

  // Add buttons to existing widgets
  setTimeout(() => {
    const widgets = Array.from(app.shell.widgets('main'));
    widgets.forEach((widget: any) => {
      if (widget && widget.content) {
        addRunButtonToEditor(widget);
      }
    });
  }, 1000);
}