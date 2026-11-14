import { create } from "zustand";

interface AssistantState {
  open: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  openAssistant: () => set({ open: true }),
  closeAssistant: () => set({ open: false }),
}));
