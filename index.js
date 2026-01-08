import express from "express";
import axios from "axios";

import { detectLanguage } from "./language.js";
import { matchIntent } from "./matcher.js";
import { ANSWERS } from "./answers.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 3000;
const TARGET_SERVER_URL = process.env.TARGET_SERVER_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!TARGET_SERVER_URL || !ADMIN_SECRET) {
  console.error("Missing env vars");
  process.exit(1);
}

app.post("/incoming-message", async (req, res) => {
  try {
    const {
      guestEmail,
      guestName,
      reservationId,
      message
    } = req.body || {};

    if (!guestEmail || !message) {
      return res.json({ ok: true, ignored: true });
    }

    const lang = detectLanguage(message);
    if (!lang || !ANSWERS[lang]) {
      return res.json({ ok: true, ignored: "language" });
    }

    const intent = matchIntent(message);
    if (!intent || !ANSWERS[lang][intent]) {
      return res.json({ ok: true, ignored: "intent" });
    }

    await axios.post(
      `${TARGET_SERVER_URL}/hostaway-outbound`,
      {
        guestEmail,
        guestName,
        reservationId,
        message: ANSWERS[lang][intent]
      },
      {
        headers: {
          "x-admin-secret": ADMIN_SECRET,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({ ok: true, sent: true, intent, lang });
  } catch (err) {
    console.error("AI error:", err.message);
    return res.status(500).json({ ok: false });
  }
});

app.listen(PORT, () => {
  console.log("AI Guest Assistant running on port", PORT);
});
