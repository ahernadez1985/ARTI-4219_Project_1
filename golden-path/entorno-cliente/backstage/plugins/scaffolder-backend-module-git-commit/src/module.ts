import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { ScmIntegrations } from '@backstage/integration';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createGitPullCommitAction } from './actions/gitPullCommit';
import { createHttpWaitAction } from './actions/httpWait';

export const scaffolderModuleGitCommit = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'git-commit',
  register(reg) {
    reg.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolder, config }) {
        const integrations = ScmIntegrations.fromConfig(config);
        scaffolder.addActions(
          createGitPullCommitAction({ integrations }),
          createHttpWaitAction(),
        );
      },
    });
  },
});
