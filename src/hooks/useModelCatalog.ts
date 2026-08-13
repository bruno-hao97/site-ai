import { useEffect, useState } from 'react';
import {
  catalogAvailableModels,
  fetchModelCatalog,
  type CatalogModel,
} from '../services/modelCatalog';

export function useModelCatalog() {
  const [catalog, setCatalog] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void fetchModelCatalog()
      .then((rows) => {
        if (!active) return;
        setCatalog(rows);
      })
      .catch((err) => {
        if (!active) return;
        setCatalog([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const available = catalogAvailableModels(catalog);

  return { catalog, available, loading, error, count: available.length };
}
