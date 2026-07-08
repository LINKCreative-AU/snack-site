// Vercel serverless function — creates a Stripe Checkout Session for the snack. build.
// Charges the one-off upfront (build $100 + optional add-ons + GST) now, and saves the
// card so the $75/mo subscription can be started at go-live.
// Requires env var STRIPE_SECRET_KEY (use a test key while in test mode).

const Stripe = require('stripe');

// prices in cents (AUD), ex-GST
const BUILD = 10000;   // $100 build (buy-in)
const LOGO = 20000;    // +$200 logo design
const KIT = 25000;     // +$250 brand kit
const GST_RATE = 0.10;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Payments not configured yet (no STRIPE_SECRET_KEY set in Vercel).' });
    return;
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const b = req.body || {};
    const designLogo = b.logo === 'design';
    const brandKit = b.brandKit === true || b.brandKit === 'yes' || b.brandKit === 'true';

    const items = [{ name: 'snack. website build — 5 pages, live in a week', amount: BUILD }];
    if (designLogo) items.push({ name: 'Logo design — human-made', amount: LOGO });
    if (brandKit) items.push({ name: 'Full brand kit — colours, fonts, style guide', amount: KIT });

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const gst = Math.round(subtotal * GST_RATE);

    const line_items = items.map((i) => ({
      price_data: { currency: 'aud', product_data: { name: i.name }, unit_amount: i.amount },
      quantity: 1,
    }));
    line_items.push({
      price_data: { currency: 'aud', product_data: { name: 'GST (10%)' }, unit_amount: gst },
      quantity: 1,
    });

    const origin = req.headers.origin || ('https://' + (req.headers.host || 'snack.com.au'));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: b.email || undefined,
      // Save the card so we can start the $75/mo subscription at go-live.
      payment_intent_data: { setup_future_usage: 'off_session' },
      metadata: {
        name: (b.name || '').slice(0, 120),
        business: (b.business || '').slice(0, 120),
        phone: (b.phone || '').slice(0, 60),
        about: (b.about || '').slice(0, 480),
        audience: (b.audience || '').slice(0, 240),
        logo: designLogo ? 'design (+$200)' : 'client-supplied',
        brand_kit: brandKit ? 'yes (+$250)' : 'no',
        ongoing: '$75/mo (+GST) from go-live',
      },
      success_url: origin + '/?paid=true',
      cancel_url: origin + '/?cancelled=true',
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Checkout failed' });
  }
};
