export type PendingAuth = {
  /** Email-based auth — primary path */
  email?: string;
  phone?: string;
  mode: "signup" | "login";
  sentAt: number;
  nextPath?: string;
  role?: "player" | "coach" | "admin";
  acceptedLegalDocuments?: string[];
};

const pendingAuthKey = "lobb.pending-auth";

export function setPendingAuth(auth: PendingAuth) {
  localStorage.setItem(pendingAuthKey, JSON.stringify(auth));
}

export function getPendingAuth(): PendingAuth | null {
  const value = localStorage.getItem(pendingAuthKey);
  return value ? (JSON.parse(value) as PendingAuth) : null;
}

export function clearPendingAuth() {
  localStorage.removeItem(pendingAuthKey);
}
