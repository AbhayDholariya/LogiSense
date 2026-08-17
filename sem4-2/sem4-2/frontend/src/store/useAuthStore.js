/**
 * useAuthStore — Server-Side Authentication
 * ==========================================
 * All auth goes through the Django/NeonDB backend:
 *   POST /api/auth/login    → bcrypt verify, returns signed JWT (HS256)
 *   POST /api/auth/verify   → validates JWT on page refresh
 *
 * JWT payload: { id, username, panel, role, displayName, companyName,
 *               adminContact, loginTime, iat, exp, jti }
 * Token is stored in sessionStorage (clears on tab close).
 * No passwords, hashes, or user data touch localStorage.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const API_BASE = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "sc_auth_token";

// ─── Validation helpers (client-side, mirrors server validation) ─────────────

export const USERNAME_RE = /^[a-z0-9_.]{3,64}$/;
export const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUsername(raw) {
  const u = raw?.toLowerCase().trim() ?? "";
  if (!u) return "Username is required.";
  if (!USERNAME_RE.test(u))
    return "Username must be 3–64 chars: lowercase letters, digits, underscores or dots.";
  return null;
}

export function validatePassword(pw) {
  if (!pw) return "Password is required.";
  if (pw.length < 6) return "Password must be at least 6 characters.";
  if (pw.length > 128) return "Password must not exceed 128 characters.";
  return null;
}

export function validateEmail(email) {
  if (!email) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Invalid email format.";
  return null;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: false,
      error:   null,

      // ── LOGIN ──────────────────────────────────────────────────────────────
      login: async (username, password) => {
        set({ loading: true, error: null });

        // Client-side validation first (fast feedback)
        const usernameErr = validateUsername(username);
        const passwordErr = validatePassword(password);
        if (usernameErr || passwordErr) {
          set({ loading: false, error: usernameErr || passwordErr });
          return null;
        }

        try {
          const { ok, status, data } = await apiPost("/api/auth/login", {
            username: username.toLowerCase().trim(),
            password,
          });

          if (!ok) {
            const msg = data?.error || data?.detail || "Login failed.";
            set({ loading: false, error: msg });
            return null;
          }

          const { token, user } = data;
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ state: { token } }));
          set({ user, token, loading: false, error: null });
          return user.panel;
        } catch (err) {
          const msg = err?.message?.includes("Failed to fetch")
            ? "Cannot connect to backend — run: python django_backend/manage.py runserver"
            : String(err);
          set({ loading: false, error: msg });
          return null;
        }
      },

      // ── REGISTER ──────────────────────────────────────────────────────────
      // Self-registration is disabled. New customers are created by admin
      // when accepting a demo request. This stub is kept for type safety.
      register: async () => {
        set({ error: 'Self-registration is disabled. Please contact your LogiSense account manager.' });
        return false;
      },

      // ── LOGOUT ────────────────────────────────────────────────────────────
      logout: () => {
        sessionStorage.removeItem(TOKEN_KEY);
        set({ user: null, token: null, error: null });
      },

      // ── VERIFY SESSION (called on page refresh) ───────────────────────────
      verifySession: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const { ok, data } = await apiPost("/api/auth/verify", { token });
          if (!ok) {
            set({ user: null, token: null });
            sessionStorage.removeItem(TOKEN_KEY);
            return;
          }
          // Reject legacy tokens with removed panels
          const { user } = data;
          if (user?.panel !== "india" && user?.panel !== "customer") {
            set({ user: null, token: null });
            sessionStorage.removeItem(TOKEN_KEY);
            return;
          }
          set({ user });
        } catch {
          // Backend offline — keep token, clear user so ProtectedRoute
          // redirects to login
          set({ user: null });
        }
      },

      clearError: () => set({ error: null }),
      setError:   (msg) => set({ error: msg }),
    }),
    {
      name:    TOKEN_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ token: s.token }),
    },
  ),
);
