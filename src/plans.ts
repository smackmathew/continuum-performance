// Plans and prices come from functions/plans.json, the same file the server
// charges from, so what the site shows always matches what Stripe charges.
import data from '../functions/plans.json';
import { firebaseConfig, useEmulators } from './firebase-config';

export type Plan = { id: string; name: string; mode: 'subscription' | 'payment'; amount: number; interval?: string; description: string };
export const PLANS = data.plans as Plan[];
export const planById = (id: string | null | undefined) => PLANS.find((p) => p.id === id);
export const priceLabel = (p: Plan) => `$${(p.amount / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}${p.mode === 'subscription' ? `/${p.interval}` : ''}`;

/** Online payments show on the website only once Stripe is set up (repository variable VITE_PAYMENTS_ENABLED=1). */
export const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === '1' || useEmulators;
export const checkoutUrl =
  (import.meta.env.VITE_CHECKOUT_URL as string | undefined) || `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/startCheckout`;
/** Stripe's hosted "manage my membership" login page (Stripe → Settings → Customer portal → link). */
export const billingPortalUrl = (import.meta.env.VITE_BILLING_PORTAL_URL as string | undefined) || '';
