import fs from 'node:fs/promises';
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import {
  DefaultGithubCredentialsProvider,
  ScmIntegrationRegistry,
} from '@backstage/integration';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { COMMIT_PATTERN, findContent, pullCommit } from '../git';

/**
 * Acción `git:pull:commit`: trae un repositorio al workspace del scaffolder
 * en un commit exacto y, opcionalmente, verifica que ese commit contenga lo
 * que el template espera (archivos y textos). Falla antes de crear nada si
 * el commit no existe o no sirve.
 */
export function createGitPullCommitAction(options: {
  integrations: ScmIntegrationRegistry;
}) {
  const { integrations } = options;
  const githubCredentials =
    DefaultGithubCredentialsProvider.fromIntegrations(integrations);

  // Token de integrations.github del app-config (si el repo es de GitHub).
  const tokenFor = async (repoUrl: string) => {
    if (!integrations.github.byUrl(repoUrl)) return undefined;
    try {
      const { token } = await githubCredentials.getCredentials({ url: repoUrl });
      return token;
    } catch {
      return undefined;
    }
  };

  return createTemplateAction({
    id: 'git:pull:commit',
    description:
      'Trae un repositorio git a un commit exacto (SHA) dentro del workspace y verifica su contenido.',
    supportsDryRun: true,
    examples: [
      {
        description: 'Traer un commit y verificar que el cliente exista en él',
        example: `steps:
  - id: pull-commit
    action: git:pull:commit
    input:
      repoUrl: https://github.com/mi-org/mi-repo.git
      commit: 4ea9ecb
      requiredPaths: [backend/package.json, frontend/package.json]
      expectContent:
        - path: backend/src/config/clients
          contains: BA-004821`,
      },
    ],
    schema: {
      input: {
        repoUrl: z =>
          z
            .string()
            .regex(/^https:\/\/\S+$/, 'Debe ser una URL https://')
            .describe('URL HTTPS del repositorio'),
        commit: z =>
          z
            .string()
            .regex(COMMIT_PATTERN, 'Debe ser un SHA de 7 a 40 caracteres hexadecimales')
            .describe('SHA (completo o abreviado) del commit a traer'),
        targetPath: z =>
          z
            .string()
            .optional()
            .describe("Carpeta dentro del workspace (default 'source')"),
        token: z =>
          z
            .string()
            .optional()
            .describe(
              'Token para repos privados. Si se omite, se usa integrations.github del app-config',
            ),
        requiredPaths: z =>
          z
            .array(z.string())
            .optional()
            .describe('Rutas que deben existir en el commit'),
        expectContent: z =>
          z
            .array(z.object({ path: z.string(), contains: z.string() }))
            .optional()
            .describe(
              'Textos que deben aparecer en un archivo o carpeta (búsqueda recursiva) del commit',
            ),
      },
      output: {
        commit: z => z.string().describe('SHA completo del commit resuelto'),
        shortCommit: z => z.string().describe('SHA de 7 caracteres'),
        author: z => z.string(),
        date: z => z.string().describe('Fecha del commit (ISO 8601)'),
        message: z => z.string().describe('Primera línea del mensaje'),
        path: z => z.string().describe('Carpeta del workspace con el código'),
      },
    },
    async handler(ctx) {
      const { repoUrl, commit } = ctx.input;
      const targetPath = ctx.input.targetPath ?? 'source';
      const dir = resolveSafeChildPath(ctx.workspacePath, targetPath);

      ctx.logger.info(`Trayendo ${repoUrl} @ ${commit} -> ${targetPath}`);
      const pulled = await pullCommit({
        repoUrl,
        commit,
        dir,
        token: ctx.input.token ?? (await tokenFor(repoUrl)),
        signal: ctx.signal,
        log: message => ctx.logger.info(message),
      });
      ctx.logger.info(
        `Commit ${pulled.commit} — ${pulled.message} (${pulled.author}, ${pulled.date})`,
      );

      for (const required of ctx.input.requiredPaths ?? []) {
        try {
          await fs.access(resolveSafeChildPath(dir, required));
        } catch {
          throw new Error(`El commit ${pulled.shortCommit} no contiene '${required}'`);
        }
      }

      for (const { path: relPath, contains } of ctx.input.expectContent ?? []) {
        let matches: string[];
        try {
          resolveSafeChildPath(dir, relPath); // rechaza rutas fuera del checkout
          matches = await findContent(dir, relPath, contains);
        } catch {
          matches = [];
        }
        if (matches.length === 0) {
          throw new Error(
            `El commit ${pulled.shortCommit} no contiene '${contains}' en '${relPath}'`,
          );
        }
        ctx.logger.info(`'${contains}' encontrado en: ${matches.join(', ')}`);
      }

      ctx.output('commit', pulled.commit);
      ctx.output('shortCommit', pulled.shortCommit);
      ctx.output('author', pulled.author);
      ctx.output('date', pulled.date);
      ctx.output('message', pulled.message);
      ctx.output('path', targetPath);
    },
  });
}
