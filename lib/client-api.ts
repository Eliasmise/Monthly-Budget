export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error || "Request failed";
    throw new Error(message);
  }

  return data as T;
}
