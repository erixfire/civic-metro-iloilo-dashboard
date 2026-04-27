import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      activeSection: 'dashboard',
      setActiveSection: (section) => set({ activeSection: section }),
    }),
    {
      name: 'civic-iloilo-ui', // localStorage key
      partialize: (s) => ({ darkMode: s.darkMode, sidebarOpen: s.sidebarOpen }),
    },
  ),
)

export default useStore
