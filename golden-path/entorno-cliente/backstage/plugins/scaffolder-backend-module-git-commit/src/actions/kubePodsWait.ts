import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { KubeCluster, kubeGet, podVerdict } from '../kube';

/**
 * Acción `kube:pods:wait`: espera a que los pods de un namespace queden
 * listos y, si alguno falla sin remedio (init con error, CrashLoopBackOff,
 * imagen inexistente…), corta de inmediato con el contenedor que falló y
 * sus últimas líneas de log, en vez de esperar al timeout.
 */
export function createKubePodsWaitAction(options: { clusters: KubeCluster[] }) {
  const { clusters } = options;

  return createTemplateAction({
    id: 'kube:pods:wait',
    description:
      'Espera a que los pods queden Ready; falla de inmediato (con logs) si un contenedor falla.',
    schema: {
      input: {
        clusterName: z => z.string().describe('Cluster de kubernetes.clusterLocatorMethods del app-config'),
        namespace: z => z.string(),
        labelSelector: z => z.string().describe('Ej: app=portal'),
        timeoutSeconds: z => z.number().int().positive().optional().describe('Default 600'),
        unschedulableSeconds: z =>
          z.number().int().positive().optional().describe('Cuánto tolerar un pod sin nodo (default 90)'),
        logLines: z => z.number().int().positive().optional().describe('Líneas de log en el error (default 20)'),
      },
      output: {
        pod: z => z.string(),
        elapsedSeconds: z => z.number(),
      },
    },
    async handler(ctx) {
      const { clusterName, namespace, labelSelector } = ctx.input;
      const cluster = clusters.find(c => c.name === clusterName);
      if (!cluster) {
        throw new Error(
          `Cluster '${clusterName}' no está en kubernetes.clusterLocatorMethods (con serviceAccountToken) del app-config`,
        );
      }
      const timeoutMs = (ctx.input.timeoutSeconds ?? 600) * 1000;
      const unschedulableMs = (ctx.input.unschedulableSeconds ?? 90) * 1000;
      const logLines = ctx.input.logLines ?? 20;
      const ns = encodeURIComponent(namespace);
      const start = Date.now();
      let unschedulableSince: number | undefined;
      let lastDetail = '';

      ctx.logger.info(`Esperando pods ${labelSelector} en ${namespace} (máx ${timeoutMs / 1000}s)`);
      for (;;) {
        ctx.signal?.throwIfAborted();
        const res = await kubeGet(
          cluster,
          `/api/v1/namespaces/${ns}/pods?labelSelector=${encodeURIComponent(labelSelector)}`,
        );
        if (res.status !== 200) {
          throw new Error(`La API de Kubernetes respondió ${res.status}: ${res.body.slice(0, 300)}`);
        }
        // Si hay varios (rollout en curso), se mira el más nuevo
        const pods: any[] = JSON.parse(res.body).items ?? [];
        pods.sort((a, b) => String(b.metadata.creationTimestamp).localeCompare(a.metadata.creationTimestamp));
        const pod = pods[0];
        const elapsed = Date.now() - start;

        if (pod) {
          const name = pod.metadata.name;
          const verdict = podVerdict(pod);
          if (verdict.kind === 'ready') {
            const elapsedSeconds = Math.round(elapsed / 1000);
            ctx.logger.info(`Pod ${name} listo en ${elapsedSeconds}s`);
            ctx.output('pod', name);
            ctx.output('elapsedSeconds', elapsedSeconds);
            return;
          }
          if (verdict.kind === 'failed') {
            // Se piden más líneas de las que se muestran: el mensaje útil
            // suele quedar arriba de un stack trace largo.
            const logs = await containerLogs(cluster, ns, name, verdict.container, 200, verdict.previous);
            const cause = firstErrorLine(logs);
            throw new Error(
              `El contenedor "${verdict.container}" del pod ${name} falló (${verdict.reason})` +
                `${cause ? `: ${cause}` : ''}\n` +
                `Últimas líneas del log:\n${logs.split('\n').slice(-logLines).join('\n')}`,
            );
          }
          if (verdict.detail.startsWith('sin nodo')) {
            unschedulableSince ??= Date.now();
            if (Date.now() - unschedulableSince > unschedulableMs) {
              throw new Error(`El pod ${name} no se pudo programar en ningún nodo: ${verdict.detail}`);
            }
          } else {
            unschedulableSince = undefined;
          }
          if (verdict.detail !== lastDetail) {
            ctx.logger.info(`Pod ${name}: ${verdict.detail}`);
            lastDetail = verdict.detail;
          }
        }

        if (elapsed > timeoutMs) {
          throw new Error(`Los pods ${labelSelector} no quedaron listos en ${timeoutMs / 1000}s (último: ${lastDetail || 'sin pods'})`);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    },
  });
}

/** Primera línea con pinta de error (Error: …, npm ERR!, fatal: …) del log. */
export function firstErrorLine(logs: string): string | undefined {
  return logs
    .split('\n')
    .map(line => line.trim())
    .find(line => /^(\w*Error\b|npm (ERR!|error)|fatal:|error:)/i.test(line));
}

async function containerLogs(
  cluster: KubeCluster,
  ns: string,
  pod: string,
  container: string,
  lines: number,
  previous: boolean,
) {
  const path = (prev: boolean) =>
    `/api/v1/namespaces/${ns}/pods/${encodeURIComponent(pod)}/log?container=${encodeURIComponent(container)}&tailLines=${lines}${prev ? '&previous=true' : ''}`;
  try {
    let res = await kubeGet(cluster, path(previous), '*/*');
    if (res.status !== 200 && previous) res = await kubeGet(cluster, path(false), '*/*');
    return res.status === 200 ? res.body.trim() || '(log vacío)' : `(no se pudo leer el log: HTTP ${res.status})`;
  } catch (error: any) {
    return `(no se pudo leer el log: ${error?.message ?? error})`;
  }
}
