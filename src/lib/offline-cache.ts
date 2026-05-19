export async function fetchWithCache<T>(key: string, url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, init);
    const payload = (await response.json()) as T;
    if (!response.ok) {
      const message = typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "Request failed";
      throw new Error(message);
    }
    if (typeof window !== "undefined" && (!init?.method || init.method === "GET")) {
      window.localStorage.setItem(key, JSON.stringify(payload));
    }
    return payload;
  } catch (error) {
    if (typeof window !== "undefined" && (!init?.method || init.method === "GET")) {
      const cached = window.localStorage.getItem(key);
      if (cached) return JSON.parse(cached) as T;
    }
    throw error;
  }
}
