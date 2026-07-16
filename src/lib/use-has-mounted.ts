import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** true только на клиенте после гидратации — без setState в эффекте (react-hooks/set-state-in-effect). */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
