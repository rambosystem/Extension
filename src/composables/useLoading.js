import { reactive } from "vue";

export function useLoading(initialStates = {}) {
  const loadingStates = reactive(initialStates);

  const setLoading = (key, value) => {
    loadingStates[key] = value;
  };

  const withLoading = async (key, asyncFn) => {
    try {
      setLoading(key, true);
      await asyncFn();
    } finally {
      setLoading(key, false);
    }
  };

  const isAnyLoading = () => {
    return Object.values(loadingStates).some((state) => state === true);
  };

  const resetAllLoading = () => {
    Object.keys(loadingStates).forEach((key) => {
      loadingStates[key] = false;
    });
  };

  return {
    loadingStates,
    setLoading,
    withLoading,
    isAnyLoading,
    resetAllLoading,
  };
}
