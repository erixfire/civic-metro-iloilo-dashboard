import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

      sidebarOpen: false, // default closed on mobile
      toggleSidebar:  () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      activeSection: 'dashboard',
      setActiveSection: (section) => set({ activeSection: section }),
    }),
    {
      name: 'civic-iloilo-ui',
      partialize: (s) => ({ darkMode: s.darkMode, sidebarOpen: s.sidebarOpen }),
    },
  ),
)

export default useStore
