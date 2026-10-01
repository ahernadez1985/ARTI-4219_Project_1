import https from 'node:https';
import type { Config } from '@backstage/config';

/** Cluster de la sección kubernetes.clusterLocatorMethods (type: config) del app-config. */
export type KubeCluster = {
  name: string;
  url: string;
  token: string;
  skipTLSVerify: boolean;
};

export function readKubeClusters(config: Config): KubeCluster[] {
  const clusters: KubeCluster[] = [];
  for (const method of config.getOptionalConfigArray('kubernetes.clusterLocatorMethods') ?? []) {
    if (method.getString('type') !== 'config') continue;
    for (const c of method.getOptionalConfigArray('clusters') ?? []) {
      const token = c.getOptionalString('serviceAccountToken');
      if (!token) continue;
      clusters.push({
        name: c.getString('name'),
        url: c.getString('url').replace(/\/$/, ''),
        token,
        skipTLSVerify: c.getOptionalBoolean('skipTLSVerify') ?? false,
      });
    }
  }
  return clusters;
}

/** GET mínimo contra la API de Kubernetes (sin dependencias). */
export function kubeGet(cluster: KubeCluster, path: string, accept = 'application/json') {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = https.request(
      `${cluster.url}${path}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${cluster.token}`, Accept: accept },
        rejectUnauthorized: !cluster.skipTLSVerify,
        timeout: 10_000,
      },
      res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

// Estados de espera que no se arreglan solos: el pod nunca va a quedar listo.
const FATAL_WAITING = new Set([
  'CrashLoopBackOff',
  'ErrImagePull',
  'ImagePullBackOff',
  'CreateContainerConfigError',
  'CreateContainerError',
  'InvalidImageName',
]);

export type PodVerdict =
  | { kind: 'ready' }
  | { kind: 'pending'; detail: string }
  | { kind: 'failed'; container: string; reason: string; previous: boolean };

/** Interpreta el status de un pod: listo, todavía en curso, o fallido sin remedio. */
export function podVerdict(pod: any): PodVerdict {
  const status = pod?.status ?? {};
  const conditions: any[] = status.conditions ?? [];

  for (const c of status.initContainerStatuses ?? []) {
    const t = c.state?.terminated;
    if (t && t.exitCode !== 0) {
      return { kind: 'failed', container: c.name, reason: `${t.reason ?? 'Error'} (exit ${t.exitCode})`, previous: false };
    }
    const w = c.state?.waiting;
    if (w && FATAL_WAITING.has(w.reason)) {
      return { kind: 'failed', container: c.name, reason: w.reason, previous: c.restartCount > 0 };
    }
  }
  for (const c of status.containerStatuses ?? []) {
    const w = c.state?.waiting;
    if (w && FATAL_WAITING.has(w.reason)) {
      return { kind: 'failed', container: c.name, reason: w.reason, previous: c.restartCount > 0 };
    }
  }

  if (conditions.some(c => c.type === 'Ready' && c.status === 'True')) {
    return { kind: 'ready' };
  }

  const unscheduled = conditions.find(c => c.type === 'PodScheduled' && c.status === 'False');
  if (unscheduled) {
    return { kind: 'pending', detail: `sin nodo: ${unscheduled.message ?? unscheduled.reason}` };
  }
  const running = (status.initContainerStatuses ?? []).find((c: any) => c.state?.running);
  if (running) return { kind: 'pending', detail: `ejecutando init "${running.name}"` };
  return { kind: 'pending', detail: status.phase ?? 'Pending' };
}
