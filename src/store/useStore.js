import { create } from 'zustand'

const useStore = create((set) => ({
  darkMode: false,
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeSection: 'dashboard',
  setActiveSection: (section) => set({ activeSection: section }),
}))

export default useStore
