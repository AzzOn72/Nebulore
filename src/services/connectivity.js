import * as Network from 'expo-network';
import { create } from 'zustand';

/**
 * Tracks network reachability for "Subway Mode". When offline, the feed falls
 * back to the locally cached queue so the user can keep reading and swiping.
 */
export const useConnectivityStore = create((set) => ({
  isOnline: true,
  initialized: false,

  setOnline: (isOnline) => set({ isOnline, initialized: true }),
}));

function deriveOnline(state) {
  if (!state) return true;
  // isInternetReachable can be null/undefined before it's determined; treat
  // "connected" as online in that case to avoid false offline flashes.
  if (state.isInternetReachable === false) return false;
  return state.isConnected !== false;
}

let subscription = null;

export async function initConnectivity() {
  try {
    const state = await Network.getNetworkStateAsync();
    useConnectivityStore.getState().setOnline(deriveOnline(state));
  } catch (_) {
    useConnectivityStore.getState().setOnline(true);
  }

  // Live updates when the radio state changes (added in newer expo-network).
  if (!subscription && typeof Network.addNetworkStateListener === 'function') {
    subscription = Network.addNetworkStateListener((state) => {
      useConnectivityStore.getState().setOnline(deriveOnline(state));
    });
  }
}

export async function checkOnlineNow() {
  try {
    const state = await Network.getNetworkStateAsync();
    const online = deriveOnline(state);
    useConnectivityStore.getState().setOnline(online);
    return online;
  } catch (_) {
    return useConnectivityStore.getState().isOnline;
  }
}
