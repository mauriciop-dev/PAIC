import { supabase as typedSupabase } from '@paic/supabase/client';

export const TRIAL_WRITE_BLOCKED_EVENT = 'paic:trial-write-blocked';
export const TRIAL_WRITE_BLOCKED_MESSAGE =
  'Tu periodo de prueba venció. Puedes seguir consultando PAIC; elige un plan para volver a editar.';
const BILLING_FUNCTIONS = new Set(['activate-mp-subscription', 'create-mp-subscription']);

type WriteAccessProvider = () => boolean;

let writeAccessProvider: WriteAccessProvider = () => true;
const READ_ONLY_RPC_NAMES = new Set([
  'get_my_conjunto_id',
  'get_debtors',
  'get_guard_data',
  'get_dashboard_summary',
  'get_financial_chart_data',
  'get_platform_stats',
  'get_super_admin_charts',
  'autenticar_estacion',
  'obtener_auditoria_turnos',
  'match_documents',
]);

export function setWriteAccessProvider(provider: WriteAccessProvider): void {
  writeAccessProvider = provider;
}

function notifyWriteBlocked(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRIAL_WRITE_BLOCKED_EVENT));
  }
}

function createBlockedQuery(): any {
  const response = {
    data: null,
    error: {
      code: 'PAIC_TRIAL_EXPIRED',
      message: TRIAL_WRITE_BLOCKED_MESSAGE,
    },
  };

  let proxy: any;
  proxy = new Proxy({}, {
    get(_target, property) {
      if (property === 'then') {
        return (resolve: (value: typeof response) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(response).then(resolve, reject);
      }
      if (property === 'catch') return (reject: (reason: unknown) => unknown) => Promise.resolve(response).catch(reject);
      if (property === 'finally') return (callback: () => void) => Promise.resolve(response).finally(callback);
      return () => proxy;
    },
  });
  return proxy;
}

function isWriteAllowed(): boolean {
  return writeAccessProvider();
}

function wrapQueryBuilder<T>(builder: T): T {
  if (typeof builder !== 'object' || builder === null) return builder;

  return new Proxy(builder, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== 'function') return value;

      return (...args: unknown[]) => {
        if (property === 'insert' || property === 'update' || property === 'upsert' || property === 'delete') {
          if (!isWriteAllowed()) {
            notifyWriteBlocked();
            return createBlockedQuery();
          }
        }

        const result = Reflect.apply(value, target, args);
        if (property === 'then' || !result || typeof result !== 'object') return result;
        return wrapQueryBuilder(result);
      };
    },
  });
}

function wrapStorageBucket<T>(bucket: T): T {
  if (typeof bucket !== 'object' || bucket === null) return bucket;

  return new Proxy(bucket, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof value !== 'function') return value;

      return (...args: unknown[]) => {
        if (property === 'upload' || property === 'update' || property === 'move' || property === 'copy' || property === 'remove') {
          if (!isWriteAllowed()) {
            notifyWriteBlocked();
            return Promise.resolve({
              data: null,
              error: { message: TRIAL_WRITE_BLOCKED_MESSAGE, statusCode: 'PAIC_TRIAL_EXPIRED' },
            });
          }
        }
        return Reflect.apply(value, target, args);
      };
    },
  });
}

export const supabase: any = new Proxy(typedSupabase, {
  get(target, property) {
    if (property === 'from') {
      return (...args: unknown[]) => wrapQueryBuilder(Reflect.apply(target.from, target, args));
    }
    if (property === 'rpc') {
      return (functionName: string, ...args: unknown[]) => {
        if (!READ_ONLY_RPC_NAMES.has(functionName) && !isWriteAllowed()) {
          notifyWriteBlocked();
          return createBlockedQuery();
        }
        return Reflect.apply(target.rpc, target, [functionName, ...args]);
      };
    }
    if (property === 'storage') {
      const storage = Reflect.get(target, property, target);
      return new Proxy(storage, {
        get(storageTarget, storageProperty) {
          const storageValue = Reflect.get(storageTarget, storageProperty, storageTarget);
          if (storageProperty === 'from' && typeof storageValue === 'function') {
            return (...args: unknown[]) => wrapStorageBucket(Reflect.apply(storageValue, storageTarget, args));
          }
          return typeof storageValue === 'function' ? storageValue.bind(storageTarget) : storageValue;
        },
      });
    }
    if (property === 'functions') {
      const functions = Reflect.get(target, property, target);
      return new Proxy(functions, {
        get(functionsTarget, functionsProperty) {
          const functionsValue = Reflect.get(functionsTarget, functionsProperty, functionsTarget);
          if (functionsProperty === 'invoke' && typeof functionsValue === 'function') {
            return (functionName: string, ...args: unknown[]) => {
              if (!BILLING_FUNCTIONS.has(functionName) && !isWriteAllowed()) {
                notifyWriteBlocked();
                return Promise.resolve({
                  data: null,
                  error: { message: TRIAL_WRITE_BLOCKED_MESSAGE, name: 'PAIC_TRIAL_EXPIRED' },
                });
              }
              return Reflect.apply(functionsValue, functionsTarget, [functionName, ...args]);
            };
          }
          return typeof functionsValue === 'function' ? functionsValue.bind(functionsTarget) : functionsValue;
        },
      });
    }
    return Reflect.get(target, property, target);
  },
});
