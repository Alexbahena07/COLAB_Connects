type DigestEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 400;

const isValidFrom = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const emailMatch = trimmed.match(/<([^>]+)>/);
  const candidate = emailMatch ? emailMatch[1] : trimmed;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const sendDigestEmail = async ({ to, subject, html, text }: DigestEmailInput) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email provider not configured");
  }
  if (!isValidFrom(from)) {
    throw new Error("Invalid from address format");
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
      }),
    });

    if (response.ok) {
      return;
    }

    const retryable = response.status === 429 || response.status >= 500;
    const detail = await response.text();
    lastError = new Error(`Resend error (${response.status}): ${detail}`);

    if (!retryable || attempt === MAX_RETRIES) {
      break;
    }

    const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
    await delay(backoff);
  }

  throw lastError ?? new Error("Resend error: unknown");
};
