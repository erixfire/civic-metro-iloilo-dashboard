import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

      sidebarOpen: false,
      toggleSidebar:  () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      activeSection: 'dashboard',
      setActiveSection: (section) => set({ activeSection: section }),

      // Language toggle: 'en' (English) | 'hil' (Hiligaynon)
      lang: 'en',
      toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'hil' : 'en' })),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'civic-iloilo-ui',
      // Persist darkMode, sidebarOpen, and lang across sessions
      partialize: (s) => ({ darkMode: s.darkMode, sidebarOpen: s.sidebarOpen, lang: s.lang }),
    },
  ),
)

export default useStore
