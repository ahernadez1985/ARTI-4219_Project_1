import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

/**
 * Acción `http:wait`: consulta una URL hasta que responde con el estado
 * esperado (y, opcionalmente, un texto en el cuerpo). Sirve para que el
 * template termine solo cuando el entorno ya se puede usar desde el navegador.
 */
export function createHttpWaitAction() {
  return createTemplateAction({
    id: 'http:wait',
    description:
      'Espera a que una URL responda con el estado esperado (y opcionalmente contenga un texto).',
    schema: {
      input: {
        url: z => z.string().url().describe('URL a consultar'),
        expectStatus: z =>
          z.number().int().optional().describe('Código HTTP esperado (default 200)'),
        expectContains: z =>
          z.string().optional().describe('Texto que debe aparecer en el cuerpo'),
        timeoutSeconds: z =>
          z.number().int().positive().optional().describe('Tiempo máximo de espera (default 600)'),
        intervalSeconds: z =>
          z.number().int().positive().optional().describe('Pausa entre intentos (default 5)'),
      },
      output: {
        url: z => z.string(),
        elapsedSeconds: z => z.number(),
      },
    },
    async handler(ctx) {
      const { url, expectContains } = ctx.input;
      const expectStatus = ctx.input.expectStatus ?? 200;
      const timeoutMs = (ctx.input.timeoutSeconds ?? 600) * 1000;
      const intervalMs = (ctx.input.intervalSeconds ?? 5) * 1000;
      const start = Date.now();

      ctx.logger.info(`Esperando ${url} (HTTP ${expectStatus}, máx ${timeoutMs / 1000}s)`);
      let last = 'sin respuesta';
      for (;;) {
        ctx.signal?.throwIfAborted();
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
          const body = await res.text();
          if (res.status !== expectStatus) {
            last = `HTTP ${res.status}`;
          } else if (expectContains && !body.includes(expectContains)) {
            last = `HTTP ${res.status} sin '${expectContains}'`;
          } else {
            const elapsedSeconds = Math.round((Date.now() - start) / 1000);
            ctx.logger.info(`${url} listo en ${elapsedSeconds}s`);
            ctx.output('url', url);
            ctx.output('elapsedSeconds', elapsedSeconds);
            return;
          }
        } catch (error: any) {
          last = error?.cause?.code ?? error?.message ?? String(error);
        }
        const elapsed = Date.now() - start;
        if (elapsed + intervalMs > timeoutMs) {
          throw new Error(`${url} no quedó listo en ${timeoutMs / 1000}s (último: ${last})`);
        }
        ctx.logger.info(`Aún no (${last}); reintento en ${intervalMs / 1000}s`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    },
  });
}
