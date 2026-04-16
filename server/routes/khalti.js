const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const { khaltiInitiate } = require("../utils/khalti");

const PRO_AMOUNT_PAISA = 10000;
const VALID_ALERT_STATIONS = [
  "Ratnapark",
  "Bhaisipati",
  "Pulchowk",
  "Shankapark",
  "Bhaktapur",
];

function requestOrigin(req) {
  const origin = req.get("Origin");
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, "");
  const host = req.get("Host") || "localhost:5000";
  const proto = req.protocol || "http";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function sameOriginAsRequest(req, candidateUrl) {
  if (!candidateUrl || typeof candidateUrl !== "string") return false;
  try {
    const allowed = new URL(requestOrigin(req));
    const u = new URL(candidateUrl);
    return u.origin === allowed.origin;
  } catch {
    return false;
  }
}

// @route   POST /api/payment/khalti/initiate
// @desc    Start Khalti ePayment (secret key stays on server)
// @access  Private
router.post("/initiate", auth, async (req, res) => {
  try {
    const { kind, return_url, website_url, station } = req.body || {};

    if (!return_url || !website_url) {
      return res.status(400).json({
        msg: "return_url and website_url are required",
      });
    }

    if (
      !sameOriginAsRequest(req, return_url) ||
      !sameOriginAsRequest(req, website_url)
    ) {
      return res.status(400).json({
        msg: "return_url and website_url must match this site origin",
      });
    }

    const user = await User.findById(req.user.id).select("name email");
    if (!user || !user.email) {
      return res.status(404).json({ msg: "User not found" });
    }

    const flow = kind === "location" ? "location" : "pro";
    let purchase_order_id;
    let purchase_order_name;
    let product_details;

    if (flow === "location") {
      const loc = (station || "").trim();
      if (!VALID_ALERT_STATIONS.includes(loc)) {
        return res.status(400).json({ msg: "Invalid alert station" });
      }
      purchase_order_id = `AIRKTM-LOC-${Date.now()}`;
      purchase_order_name = `AirKTM Alert Location Change - ${loc}`;
      product_details = [
        {
          identity: "airktm-loc-change",
          name: `AirKTM Alert Location Change to ${loc}`,
          total_price: PRO_AMOUNT_PAISA,
          quantity: 1,
          unit_price: PRO_AMOUNT_PAISA,
        },
      ];
    } else {
      purchase_order_id = `AIRKTM-PRO-${Date.now()}`;
      purchase_order_name = "AirKTM Pro Subscription";
      product_details = [
        {
          identity: "airktm-pro-monthly",
          name: "AirKTM Pro Monthly Subscription",
          total_price: PRO_AMOUNT_PAISA,
          quantity: 1,
          unit_price: PRO_AMOUNT_PAISA,
        },
      ];
    }

    const customer_info = {
      name: (user.name || "AirKTM User").trim() || "AirKTM User",
      email: user.email.trim(),
      phone: "9800000000",
    };

    const payload = {
      return_url,
      website_url,
      amount: PRO_AMOUNT_PAISA,
      purchase_order_id,
      purchase_order_name,
      customer_info,
      product_details,
    };

    console.log("[Khalti] Initiate payload:", JSON.stringify(payload, null, 2));
    
    const result = await khaltiInitiate(payload);
    
    console.log("[Khalti] Initiate result:", JSON.stringify(result, null, 2));
    
    if (!result.ok) {
      return res.status(502).json({ msg: result.error });
    }

    return res.json({
      payment_url: result.payment_url,
      pidx: result.pidx,
    });
  } catch (err) {
    console.error("Khalti initiate route:", err.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
