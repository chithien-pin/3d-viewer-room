import { create } from "zustand";

interface RuntimeState {
  ready: boolean;
  setReady: (ready: boolean) => void;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));
