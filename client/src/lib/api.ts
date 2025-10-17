export async function login(username: string, password: string) {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }

    return await res.json();
  } catch (err: any) {
    throw new Error(`Error de red o servidor no disponible: ${err.message}`);
  }
}
