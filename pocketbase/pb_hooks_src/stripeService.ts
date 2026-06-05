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

declare const process: {
  env: Record<string, string | undefined>;
};

export function createCheckoutSession(
  lineItems: Array<{ price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }>,
  metadata: Record<string, string>,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string
): { id: string; url: string } {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  // Build form URL-encoded body
  const params: string[] = [];
  params.push("mode=payment");
  params.push(`success_url=${encodeURIComponent(successUrl)}`);
  params.push(`cancel_url=${encodeURIComponent(cancelUrl)}`);
  if (customerEmail) {
    params.push(`customer_email=${encodeURIComponent(customerEmail)}`);
  }
  
  // native promo codes enabled
  params.push("allow_promotion_codes=true");

  lineItems.forEach((item, idx) => {
    params.push(`line_items[${idx}][price_data][currency]=${item.price_data.currency}`);
    params.push(`line_items[${idx}][price_data][product_data][name]=${encodeURIComponent(item.price_data.product_data.name)}`);
    params.push(`line_items[${idx}][price_data][unit_amount]=${item.price_data.unit_amount}`);
    params.push(`line_items[${idx}][quantity]=${item.quantity}`);
  });

  Object.entries(metadata).forEach(([key, val]) => {
    params.push(`metadata[${key}]=${encodeURIComponent(val)}`);
  });

  const res = $http.send({
    url: "https://api.stripe.com/v1/checkout/sessions",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + stripeSecretKey,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.join("&")
  });

  if (res.statusCode >= 400) {
    throw new Error("Stripe checkout session creation failed: " + res.raw);
  }

  return JSON.parse(res.raw) as { id: string; url: string };
}

export function retrieveCheckoutSession(sessionId: string): unknown {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  const res = $http.send({
    url: "https://api.stripe.com/v1/checkout/sessions/" + sessionId,
    method: "GET",
    headers: {
      "Authorization": "Bearer " + stripeSecretKey
    }
  });

  if (res.statusCode >= 400) {
    throw new Error("Stripe session retrieval failed: " + res.raw);
  }

  return JSON.parse(res.raw);
}

export function refundPaymentIntent(paymentIntentId: string): unknown {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  const res = $http.send({
    url: "https://api.stripe.com/v1/refunds",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + stripeSecretKey,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `payment_intent=${paymentIntentId}`
  });

  if (res.statusCode >= 400) {
    throw new Error("Stripe refund failed: " + res.raw);
  }

  return JSON.parse(res.raw);
}
