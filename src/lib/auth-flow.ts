export type PendingAuth = {
  /** Email-based auth — primary path */
  email?: string;
  /** Phone-based auth — legacy / dev quick-login only */
  phone?: string;
  mode: "signup" | "login";
  sentAt: number;
  nextPath?: string;
  role?: "player" | "coach" | "admin";
  devCode?: string;
};

const pendingAuthKey = "lobb.pending-auth";

export function setPendingAuth(auth: PendingAuth) {
  sessionStorage.setItem(pendingAuthKey, JSON.stringify(auth));
}

export function getPendingAuth(): PendingAuth | null {
  const value = sessionStorage.getItem(pendingAuthKey);
  return value ? (JSON.parse(value) as PendingAuth) : null;
}

export function clearPendingAuth() {
  sessionStorage.removeItem(pendingAuthKey);
}
