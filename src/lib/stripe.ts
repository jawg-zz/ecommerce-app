import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export async function createPaymentIntent(amount: number, metadata: Record<string, string>) {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  })
}
