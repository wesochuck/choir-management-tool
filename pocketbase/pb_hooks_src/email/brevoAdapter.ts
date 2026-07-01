declare const $http: {
  send(config: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }): {
    statusCode: number;
    headers: Record<string, string[]>;
    raw: string;
  };
};

export interface BrevoEmailPayload {
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface BrevoSmsPayload {
  senderName: string;
  recipientPhone: string;
  content: string;
}

/**
 * Sends a transactional email using the Brevo API.
 */
export function dispatchEmailViaBrevo(apiKey: string, payload: BrevoEmailPayload): void {
  if (!apiKey) {
    throw new Error('Missing Brevo API Key');
  }

  const body = JSON.stringify({
    sender: {
      name: payload.senderName,
      email: payload.senderAddress,
    },
    to: [
      {
        email: payload.recipientEmail,
        name: payload.recipientName,
      },
    ],
    subject: payload.subject,
    htmlContent: payload.htmlContent,
    textContent: payload.textContent || undefined,
  });

  const res = $http.send({
    url: 'https://api.brevo.com/v3/smtp/email',
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: body,
  });

  if (res.statusCode >= 400) {
    throw new Error('Brevo email API failed with status ' + res.statusCode + ': ' + res.raw);
  }
}

/**
 * Sends a transactional SMS using the Brevo API.
 */
export function dispatchSmsViaBrevo(apiKey: string, payload: BrevoSmsPayload): void {
  if (!apiKey) {
    throw new Error('Missing Brevo API Key');
  }

  // Brevo SMS sender is restricted to max 11 alphanumeric characters
  // or 15 numeric digits. Let's enforce the alphanumeric format constraints.
  let cleanSender = payload.senderName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 11);
  if (!cleanSender) {
    cleanSender = 'ChoirMsg'; // Fallback sender name
  }

  const body = JSON.stringify({
    sender: cleanSender,
    recipient: payload.recipientPhone,
    content: payload.content,
    type: 'transactional',
  });

  const res = $http.send({
    url: 'https://api.brevo.com/v3/transactionalSMS/send',
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: body,
  });

  if (res.statusCode >= 400) {
    throw new Error('Brevo SMS API failed with status ' + res.statusCode + ': ' + res.raw);
  }
}
