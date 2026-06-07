type EmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

function list(value?: string | string[]) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function getAdminEmailList() {
  return list(process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_EMAILS);
}

export async function sendTransactionalEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'Baha Buddy <support@bahabuddy.com>';
  const to = list(input.to);

  if (!apiKey || to.length === 0) {
    console.log('Email skipped', { hasApiKey: Boolean(apiKey), to, subject: input.subject });
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject: input.subject, html: input.html, text: input.text }),
  });

  if (!res.ok) {
    const message = await res.text();
    console.error('Email failed', res.status, message);
    return { skipped: false, error: message };
  }

  return res.json().catch(() => ({ ok: true }));
}

export function webUrl(path: string) {
  const base = process.env.WEB_APP_URL || 'https://bahabuddy.com';
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
