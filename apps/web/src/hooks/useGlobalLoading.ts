import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export function useGlobalLoading() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  
  return isFetching > 0 || isMutating > 0;
}
