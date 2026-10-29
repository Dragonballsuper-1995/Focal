import { useEffect } from 'react';
import { subscribeLauncherEvents } from '@/services/ipc';

export interface UseTauriEventsOptions {
  onShown?: () => void;
  onHidden?: () => void;
}

export function useTauriEvents({ onShown, onHidden }: UseTauriEventsOptions) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await subscribeLauncherEvents(
        () => onShown?.(),
        () => onHidden?.()
      );
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, [onShown, onHidden]);
}
