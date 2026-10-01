/**
 * Módulo de scaffolder que agrega las acciones `git:pull:commit` y `http:wait`.
 *
 * Uso en packages/backend/src/index.ts:
 *   backend.add(import('@internal/backstage-plugin-scaffolder-backend-module-git-commit'));
 */
export { scaffolderModuleGitCommit as default } from './module';
export { createGitPullCommitAction } from './actions/gitPullCommit';
export { createHttpWaitAction } from './actions/httpWait';
export { pullCommit, type PulledCommit, type PullCommitOptions } from './git';
