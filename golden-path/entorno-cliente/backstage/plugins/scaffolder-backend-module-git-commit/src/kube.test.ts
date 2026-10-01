import { firstErrorLine } from './actions/kubePodsWait';
import { podVerdict } from './kube';

const pod = (status: any) => ({ status });

describe('podVerdict', () => {
  it('listo cuando la condición Ready es True', () => {
    expect(podVerdict(pod({ conditions: [{ type: 'Ready', status: 'True' }] }))).toEqual({ kind: 'ready' });
  });

  it('falla si un init container termina con error', () => {
    const v = podVerdict(
      pod({
        initContainerStatuses: [
          { name: 'fetch', state: { terminated: { exitCode: 0 } } },
          { name: 'build-backend', state: { terminated: { exitCode: 1, reason: 'Error' } } },
        ],
      }),
    );
    expect(v).toEqual({ kind: 'failed', container: 'build-backend', reason: 'Error (exit 1)', previous: false });
  });

  it('falla si un contenedor queda en CrashLoopBackOff (logs del intento anterior)', () => {
    const v = podVerdict(
      pod({
        containerStatuses: [
          { name: 'web', state: { running: {} }, restartCount: 0 },
          { name: 'backend', state: { waiting: { reason: 'CrashLoopBackOff' } }, restartCount: 3 },
        ],
      }),
    );
    expect(v).toEqual({ kind: 'failed', container: 'backend', reason: 'CrashLoopBackOff', previous: true });
  });

  it('sigue esperando mientras construye o si no hay nodo', () => {
    expect(
      podVerdict(pod({ initContainerStatuses: [{ name: 'build-frontend', state: { running: {} } }] })),
    ).toEqual({ kind: 'pending', detail: 'ejecutando init "build-frontend"' });
    expect(
      podVerdict(pod({ conditions: [{ type: 'PodScheduled', status: 'False', message: 'Insufficient memory' }] })),
    ).toEqual({ kind: 'pending', detail: 'sin nodo: Insufficient memory' });
  });

  it('un contenedor arrancando (ContainerCreating) no es fatal', () => {
    expect(
      podVerdict(pod({ phase: 'Pending', containerStatuses: [{ name: 'backend', state: { waiting: { reason: 'ContainerCreating' } } }] })),
    ).toEqual({ kind: 'pending', detail: 'Pending' });
  });
});

describe('firstErrorLine', () => {
  it('encuentra el error útil antes del stack trace', () => {
    const logs = "> node src/server.js\nnode:internal/modules/cjs/loader:1368\n  throw err;\n  ^\n\nError: Cannot find module './nexapay'\nRequire stack:\n    at Module._load (x)";
    expect(firstErrorLine(logs)).toBe("Error: Cannot find module './nexapay'");
    expect(firstErrorLine('npm error code ERESOLVE\nnpm error x')).toBe('npm error code ERESOLVE');
    expect(firstErrorLine('todo bien')).toBeUndefined();
  });
});
