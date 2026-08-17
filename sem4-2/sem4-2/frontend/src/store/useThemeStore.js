import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: "light", // default to light
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      return { theme: newTheme };
    }),
  setTheme: (theme) =>
    set(() => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      return { theme };
    }),
}));
