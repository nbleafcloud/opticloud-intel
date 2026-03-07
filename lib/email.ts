export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send an email via Brevo with one automatic retry on 5xx/network errors.
 * Uses AbortController for 10s timeout and exponential backoff (1s, then 3s).
 * Does not retry on 4xx errors (validation failures).
 */
export async function sendBrevoEmail(
  apiKey: string,
  payload: {
    sender: { name: string; email: string };
    to: { email: string }[];
    cc?: { email: string }[];
    subject: string;
    htmlContent: string;
  }
): Promise<boolean> {
  const BACKOFF_MS = [1000, 3000]; // exponential backoff: 1s, then 3s

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return true;

      const body = await res.text();
      console.error(`Brevo send failed (attempt ${attempt}): HTTP ${res.status}`, body);

      // Don't retry on 4xx errors — these are validation failures that won't
      // succeed on retry (bad payload, invalid API key, etc.)
      if (res.status >= 400 && res.status < 500) return false;
    } catch (err) {
      clearTimeout(timeout);
      console.error(`Brevo send error (attempt ${attempt}):`, err);
    }

    // Exponential backoff before retry
    if (attempt < 2) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
  }
  return false;
}
