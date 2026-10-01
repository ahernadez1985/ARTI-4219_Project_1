import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** SHA hexadecimal de 7 a 40 caracteres. Nunca una rama ni un tag. */
export const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/;

export type PullCommitOptions = {
  /** URL del repositorio (https://… o, en pruebas, file://…). */
  repoUrl: string;
  /** SHA completo o abreviado del commit a traer. */
  commit: string;
  /** Directorio destino; se crea si no existe y debe estar vacío. */
  dir: string;
  /** Token para repos privados. Viaja como cabecera HTTP, nunca en la URL ni en .git/config. */
  token?: string;
  log?: (message: string) => void;
  signal?: AbortSignal;
};

export type PulledCommit = {
  /** SHA completo (40 caracteres) del commit resuelto. */
  commit: string;
  shortCommit: string;
  author: string;
  /** Fecha del commit en ISO 8601. */
  date: string;
  /** Primera línea del mensaje del commit. */
  message: string;
};

/**
 * Trae `repoUrl` a `dir` dejando el árbol de trabajo exactamente en `commit`
 * (HEAD desacoplado).
 *
 * - SHA completo: `git fetch --depth 1 origin <sha>` (solo ese commit). Si el
 *   servidor no permite pedir un SHA directamente, cae al caso siguiente.
 * - SHA abreviado: trae el historial sin blobs (`--filter=blob:none`) para
 *   poder resolverlo; git falla si no existe o si es ambiguo.
 */
export async function pullCommit(options: PullCommitOptions): Promise<PulledCommit> {
  const { repoUrl, commit, dir, token, signal, log = () => {} } = options;

  if (!COMMIT_PATTERN.test(commit)) {
    throw new Error(
      `Commit inválido '${commit}': debe ser un SHA hexadecimal de 7 a 40 caracteres (nunca una rama)`,
    );
  }

  await fs.mkdir(dir, { recursive: true });
  if ((await fs.readdir(dir)).length > 0) {
    throw new Error(`El directorio destino no está vacío: ${dir}`);
  }

  const env = gitEnv(token);
  const git = async (...args: string[]) => {
    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: dir,
        env,
        signal,
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error: any) {
      const detail = String(error?.stderr || error?.message || error).trim();
      throw new Error(`git ${args[0]} falló: ${detail}`);
    }
  };
  const fetchHistory = () =>
    git(
      'fetch',
      '--quiet',
      '--filter=blob:none',
      'origin',
      '+refs/heads/*:refs/remotes/origin/*',
      '+refs/tags/*:refs/tags/*',
    );

  await git('init', '--quiet');
  await git('remote', 'add', 'origin', repoUrl);

  if (commit.length === 40) {
    log(`git fetch --depth 1 origin ${commit}`);
    try {
      await git('fetch', '--quiet', '--depth', '1', 'origin', commit);
    } catch {
      log('El servidor no permite pedir el SHA directamente; trayendo historial sin blobs');
      await fetchHistory();
    }
  } else {
    log(`SHA abreviado: trayendo historial sin blobs para resolver ${commit}`);
    await fetchHistory();
  }

  let resolved: string;
  try {
    resolved = await git('rev-parse', '--verify', '--quiet', `${commit}^{commit}`);
  } catch {
    throw new Error(`El commit ${commit} no existe en ${repoUrl} (o el SHA abreviado es ambiguo)`);
  }

  log(`git checkout ${resolved}`);
  await git('-c', 'advice.detachedHead=false', 'checkout', '--quiet', '--detach', resolved);

  const [sha, author, date, message] = (
    await git('log', '-1', '--format=%H%x00%an%x00%cI%x00%s', 'HEAD')
  ).split('\0');

  return { commit: sha, shortCommit: sha.slice(0, 7), author, date, message };
}

/**
 * Busca `text` en `relPath` (archivo, o carpeta recorrida recursivamente)
 * dentro de `dir`. Devuelve las rutas relativas de los archivos que lo contienen.
 */
export async function findContent(dir: string, relPath: string, text: string): Promise<string[]> {
  const matches: string[] = [];
  const visit = async (abs: string) => {
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) {
      for (const entry of await fs.readdir(abs)) {
        if (entry === '.git' || entry === 'node_modules') continue;
        await visit(path.join(abs, entry));
      }
    } else if (stat.isFile() && stat.size <= 1024 * 1024) {
      if ((await fs.readFile(abs, 'utf8')).includes(text)) {
        matches.push(path.relative(dir, abs));
      }
    }
  };
  await visit(path.join(dir, relPath));
  return matches.sort();
}

function gitEnv(token?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  if (token) {
    const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
    env.GIT_CONFIG_COUNT = '1';
    env.GIT_CONFIG_KEY_0 = 'http.extraHeader';
    env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${basic}`;
  }
  return env;
}
