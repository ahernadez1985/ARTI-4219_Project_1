import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findContent, pullCommit } from './git';

// Repo local con dos commits: el primero sin cliente, el segundo con él.
function createRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-pull-commit-'));
  const repo = path.join(root, 'repo');
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  fs.mkdirSync(path.join(repo, 'clients'), { recursive: true });
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('config', 'uploadpack.allowAnySHA1InWant', 'true');
  fs.writeFileSync(path.join(repo, 'package.json'), '{}');
  git('add', '.');
  git('commit', '--quiet', '-m', 'primero');
  const first = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(repo, 'clients', 'a.js'), "clientId: 'BA-1'");
  git('add', '.');
  git('commit', '--quiet', '-m', 'agrega cliente');
  const second = git('rev-parse', 'HEAD');
  return { root, url: `file://${repo}`, first, second };
}

describe('pullCommit', () => {
  const repo = createRepo();
  afterAll(() => fs.rmSync(repo.root, { recursive: true, force: true }));
  const target = (name: string) => path.join(repo.root, name);

  it('deja el árbol en un commit viejo con SHA completo', async () => {
    const dir = target('full');
    const pulled = await pullCommit({ repoUrl: repo.url, commit: repo.first, dir });
    expect(pulled.commit).toBe(repo.first);
    expect(pulled.message).toBe('primero');
    expect(fs.existsSync(path.join(dir, 'clients', 'a.js'))).toBe(false);
  });

  it('resuelve un SHA abreviado', async () => {
    const dir = target('short');
    const pulled = await pullCommit({ repoUrl: repo.url, commit: repo.second.slice(0, 7), dir });
    expect(pulled.commit).toBe(repo.second);
    expect(pulled.shortCommit).toBe(repo.second.slice(0, 7));
    expect(await findContent(dir, 'clients', 'BA-1')).toEqual(['clients/a.js']);
  });

  it('falla si el commit no existe', async () => {
    await expect(
      pullCommit({ repoUrl: repo.url, commit: 'deadbeef', dir: target('missing') }),
    ).rejects.toThrow(/no existe/);
  });

  it('rechaza ramas', async () => {
    await expect(
      pullCommit({ repoUrl: repo.url, commit: 'main', dir: target('branch') }),
    ).rejects.toThrow(/Commit inválido/);
  });
});
