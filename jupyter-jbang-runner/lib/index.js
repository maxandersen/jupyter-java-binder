import { IDocumentManager } from '@jupyterlab/docmanager';
import { ITranslator } from '@jupyterlab/translation';
import { addRunButton } from './runButton';
/**
 * Initialization data for the jupyter-jbang-runner extension.
 */
const plugin = {
    id: 'jupyter-jbang-runner:plugin',
    autoStart: true,
    requires: [IDocumentManager, ITranslator],
    activate: (app, docManager, translator) => {
        console.log('JupyterLab extension jupyter-jbang-runner is activated!');
        // Add run button to file editors
        addRunButton(app, docManager, translator);
    }
};
export default plugin;
