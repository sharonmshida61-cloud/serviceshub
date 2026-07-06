// ---------------------------------------------------------------------------
// Payment provider abstraction.
//
// This mock provider simulates a successful charge instantly so the whole
// booking -> pay -> confirm flow works end-to-end out of the box. To wire in
// a real processor (Stripe, Flutterwave, M-Pesa, Paystack...), implement the
// same `charge()` interface in a new file and swap the export below — no
// other code in the app needs to change.
// ---------------------------------------------------------------------------

async function charge({ amountCents, method, reference }) {
  // Simulate network latency of a real payment gateway.
  await new Promise((r) => setTimeout(r, 300));

  // Simulate a rare failure so the frontend has a real failure path to handle.
  const failed = Math.random() < 0.02;

  return {
    success: !failed,
    transactionRef: reference || `MOCK-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    amountCents,
    method,
  };
}

module.exports = { charge };
