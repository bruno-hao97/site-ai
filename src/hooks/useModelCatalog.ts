import { useEffect, useState } from 'react';
import {
  catalogAvailableModels,
  fetchModelCatalog,
  type CatalogModel,
} from '../services/modelCatalog';

export interface UseModelCatalogOptions {
  /** Bỏ cache module — tránh catalog rỗng/cũ sau hot reload. */
  force?: boolean;
  /** Retry khi catalog rỗng hoặc fetch lỗi (proxy/prefetch chưa sẵn sàng). */
  retryOnEmpty?: boolean;
  maxRetries?: number;
}

export function useModelCatalog(options: UseModelCatalogOptions = {}) {
  const { force = false, retryOnEmpty = false, maxRetries = 2 } = options;
  const [catalog, setCatalog] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const finishLoading = () => {
      if (active) setLoading(false);
    };

    const load = () => {
      if (!active) return;
      if (attempt === 0) {
        setLoading(true);
        setError('');
      }

      const useForce = force || attempt > 0;

      void fetchModelCatalog(undefined, { force: useForce })
        .then((rows) => {
          if (!active) return;
          setCatalog(rows);

          if (retryOnEmpty && rows.length === 0 && attempt < maxRetries) {
            attempt += 1;
            retryTimer = setTimeout(load, 2000 * attempt);
            return;
          }

          finishLoading();
        })
        .catch((err) => {
          if (!active) return;
          const message = err instanceof Error ? err.message : String(err);

          if (retryOnEmpty && attempt < maxRetries) {
            attempt += 1;
            retryTimer = setTimeout(load, 2000 * attempt);
            return;
          }

          setCatalog([]);
          setError(message);
          finishLoading();
        });
    };

    load();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [force, retryOnEmpty, maxRetries]);

  const available = catalogAvailableModels(catalog);

  return { catalog, available, loading, error, count: available.length };
}
