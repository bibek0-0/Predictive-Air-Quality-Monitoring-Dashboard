const KHALTI_DEFAULT_LOOKUP = "https://dev.khalti.com/api/v2/epayment/lookup/";
const KHALTI_DEFAULT_INITIATE = "https://dev.khalti.com/api/v2/epayment/initiate/";

function buildKhaltiAuthHeader() {
  const raw = (process.env.KHALTI_SECRET_KEY || "").trim();
  if (!raw) return null;
  if (/^key\s+/i.test(raw)) {
    return "Key " + raw.replace(/^key\s+/i, "").trim();
  }
  if (/^Key\s+/.test(raw)) return raw;
  return `Key ${raw}`;
}

function normalizeKhaltiUrl(url, fallback) {
  let u = (url || fallback).trim();
  if (!u.endsWith("/")) u += "/";
  return u;
}

async function verifyKhaltiEpayment(pidx) {
  const authHeader = buildKhaltiAuthHeader();
  if (!authHeader) {
    return {
      ok: false,
      error: "Payment verification is not configured (set KHALTI_SECRET_KEY)",
    };
  }

  const lookupUrl = normalizeKhaltiUrl(
    process.env.KHALTI_LOOKUP_URL,
    KHALTI_DEFAULT_LOOKUP,
  );

  let res;
  try {
    res = await fetch(lookupUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });
  } catch {
    return { ok: false, error: "Could not reach Khalti verification service" };
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    let detail = data.detail;
    if (Array.isArray(detail)) detail = detail.join(", ");
    if (typeof detail !== "string") detail = data.error_key || res.statusText;
    return { ok: false, error: detail || "Khalti lookup failed" };
  }

  if (data.status !== "Completed") {
    return {
      ok: false,
      error: `Payment not completed (status: ${data.status || "unknown"})`,
    };
  }

  const minAmount = parseInt(
    process.env.KHALTI_PRO_AMOUNT_PAISA || "10000",
    10,
  );
  const total = Number(data.total_amount);
  if (!Number.isFinite(total) || total < minAmount) {
    return { ok: false, error: "Invalid or insufficient payment amount" };
  }

  if (data.refunded === true) {
    return { ok: false, error: "Payment was refunded" };
  }

  return {
    ok: true,
    transactionId: data.transaction_id || null,
    total_amount: total,
  };
}

/**
 * Server-side Khalti ePayment initiate (secret key never sent to browser).
 */
async function khaltiInitiate(payload) {
  const authHeader = buildKhaltiAuthHeader();
  if (!authHeader) {
    return {
      ok: false,
      error: "Khalti is not configured (set KHALTI_SECRET_KEY in .env)",
    };
  }

  const initiateUrl = normalizeKhaltiUrl(
    process.env.KHALTI_INITIATE_URL,
    KHALTI_DEFAULT_INITIATE,
  );

  let res;
  try {
    res = await fetch(initiateUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return {
      ok: false,
      error: "Could not reach Khalti payment service",
    };
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    let detail = data.detail;
    if (Array.isArray(detail)) detail = detail.join(", ");
    if (typeof detail !== "string") {
      detail = data.message || data.error_key || res.statusText;
    }
    return { ok: false, error: detail || "Khalti initiate failed" };
  }

  const url = data.payment_url || data.go_link;
  if (!url) {
    return { ok: false, error: "No payment URL from Khalti" };
  }

  return {
    ok: true,
    payment_url: url,
    pidx: data.pidx || null,
  };
}

module.exports = {
  verifyKhaltiEpayment,
  khaltiInitiate,
};
