// Razorpay adapter: the ONLY file that talks to Razorpay. Swap or extend it without touching the routes.
// Secrets (server env only): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
// RZP_PLAN_PLAYER, RZP_PLAN_PRO, RZP_PLAN_ACADEMY (Razorpay plan ids for Rs 99 / 149 / 499 per month).
const env = (k: string) => Deno.env.get(k) ?? '';
export const configured = () => !!(env('RAZORPAY_KEY_ID') && env('RAZORPAY_KEY_SECRET') && env('RAZORPAY_WEBHOOK_SECRET'));
export const planIds = (): Record<string, string> => ({ player: env('RZP_PLAN_PLAYER'), pro: env('RZP_PLAN_PRO'), academy: env('RZP_PLAN_ACADEMY') });
export const planFor = (razorpayPlanId: string) => Object.entries(planIds()).find(([, v]) => v && v === razorpayPlanId)?.[0] ?? null;
export const publicKeyId = () => env('RAZORPAY_KEY_ID');

async function rz(path: string, init: RequestInit = {}) {
  const r = await fetch('https://api.razorpay.com/v1' + path, { ...init, headers: { Authorization: 'Basic ' + btoa(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`), 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`razorpay ${r.status} ${(await r.text().catch(() => '')).slice(0, 200)}`);
  return r.json();
}
export const createSubscription = (planId: string, userId: string) =>
  rz('/subscriptions', { method: 'POST', body: JSON.stringify({ plan_id: planId, total_count: 120, customer_notify: 1, notes: { user_id: userId } }) });
export const fetchSubscription = (id: string) => rz('/subscriptions/' + id);
export const cancelSubscription = (id: string, atCycleEnd: boolean) =>
  rz(`/subscriptions/${id}/cancel`, { method: 'POST', body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }) });
// Plan change on an existing subscription. Confirm in Razorpay's docs that this is supported for the payment
// methods your customers use (for example UPI AutoPay) before enabling it in production.
export const changePlan = (id: string, planId: string, when: 'now' | 'cycle_end') =>
  rz('/subscriptions/' + id, { method: 'PATCH', body: JSON.stringify({ plan_id: planId, schedule_change_at: when, customer_notify: 1 }) });

async function hmacHex(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
// Checkout callback signature for subscriptions: HMAC-SHA256(payment_id + "|" + subscription_id, key secret).
export const verifyCheckout = async (paymentId: string, subscriptionId: string, sig: string) => same(await hmacHex(env('RAZORPAY_KEY_SECRET'), `${paymentId}|${subscriptionId}`), sig);
// Webhook signature: HMAC-SHA256(raw request body, webhook secret) sent in X-Razorpay-Signature.
export const verifyWebhook = async (raw: string, sig: string) => same(await hmacHex(env('RAZORPAY_WEBHOOK_SECRET'), raw), sig);
