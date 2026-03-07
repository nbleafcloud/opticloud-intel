/**
 * Send an email via Brevo with one automatic retry on failure.
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
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;

      const body = await res.text();
      console.error(`Brevo send failed (attempt ${attempt}): HTTP ${res.status}`, body);
    } catch (err) {
      console.error(`Brevo send error (attempt ${attempt}):`, err);
    }

    // Wait 1s before retry
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}
