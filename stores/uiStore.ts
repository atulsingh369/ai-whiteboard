import { create } from "zustand";

type UIState = {
  leftSidebarOpen: boolean;
  leftSidebarPinned: boolean;
  rightPanelOpen: boolean;
  rightPanelPinned: boolean;

  activeSceneId: string | null;
  activeSceneTitle: string | null;

  syncState: "synced" | "unsynced" | "saving";

  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  pinLeftSidebar: () => void;
  pinRightPanel: () => void;
  unpinLeftSidebar: () => void;
  unpinRightPanel: () => void;
  closeAll: () => void;

  setActiveScene: (id: string | null, title: string | null) => void;
  setActiveSceneTitle: (title: string) => void;
  setSyncState: (state: "synced" | "unsynced" | "saving") => void;
};

export const useUIStore = create<UIState>((set) => ({
  leftSidebarOpen: false,
  leftSidebarPinned: false,
  rightPanelOpen: false,
  rightPanelPinned: false,

  activeSceneId: null,
  activeSceneTitle: null,

  syncState: "synced",

  toggleLeftSidebar: () =>
    set((state) => ({
      leftSidebarOpen: !state.leftSidebarOpen,
      leftSidebarPinned: !state.leftSidebarOpen,
    })),

  toggleRightPanel: () =>
    set((state) => ({
      rightPanelOpen: !state.rightPanelOpen,
      rightPanelPinned: !state.rightPanelOpen,
    })),

  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

  pinLeftSidebar: () => set({ leftSidebarOpen: true, leftSidebarPinned: true }),
  pinRightPanel: () => set({ rightPanelOpen: true, rightPanelPinned: true }),

  unpinLeftSidebar: () =>
    set({ leftSidebarOpen: false, leftSidebarPinned: false }),
  unpinRightPanel: () =>
    set({ rightPanelOpen: false, rightPanelPinned: false }),

  closeAll: () =>
    set({
      leftSidebarOpen: false,
      leftSidebarPinned: false,
      rightPanelOpen: false,
      rightPanelPinned: false,
    }),

  setActiveScene: (id, title) =>
    set({ activeSceneId: id, activeSceneTitle: title }),
  setActiveSceneTitle: (title) => set({ activeSceneTitle: title }),
  setSyncState: (syncState) => set({ syncState }),
}));
