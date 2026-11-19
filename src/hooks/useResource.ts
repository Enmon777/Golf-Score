import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../lib/supabase";
export function useResource<T>(key: string, load: (key: string) => Promise<T>) {
  const [result, setResult] = useState<{
    key: string;
    version: number;
    data: T;
  } | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => {
    setFailure(null);
    setVersion((value) => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    load(key).then(
      (data) => {
        if (active) {
          setResult({ key, version, data });
          setFailure(null);
        }
      },
      (error) => {
        if (active) setFailure({ key, message: errorMessage(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [key, load, version]);
  return {
    data: result?.key === key ? result.data : null,
    error: failure?.key === key ? failure.message : "",
    loading:
      failure?.key !== key &&
      (result?.key !== key || result.version !== version),
    reload,
  };
}
