import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import { getCenters, getAllCenters, getAvailableSlots, processBooking } from "./zenoti.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── In-memory booking settings ──────────────────────────
let bookingSettings = {
  enabled: false,              // Master on/off for public booking
  allowedCenterIds: [],        // Which center IDs are bookable
};

// ─── Booking stats (in-memory) ───────────────────────────
let bookingStats = {
  started: 0,    // Antal gange booking flow er startet (centers hentet)
  completed: 0,  // Antal gennemførte bookinger
};

// ─── Settings API ────────────────────────────────────────

app.get("/api/settings", (req, res) => {
  res.json(bookingSettings);
});

app.put("/api/settings", (req, res) => {
  const { enabled, allowedCenterIds } = req.body;
  if (typeof enabled === "boolean") bookingSettings.enabled = enabled;
  if (Array.isArray(allowedCenterIds)) bookingSettings.allowedCenterIds = allowedCenterIds;
  console.log("[Settings] Updated:", JSON.stringify(bookingSettings));
  res.json(bookingSettings);
});

// ─── Stats API ───────────────────────────────────────────

app.get("/api/stats", (req, res) => {
  res.json(bookingStats);
});

app.post("/api/stats/reset", (req, res) => {
  bookingStats = { started: 0, completed: 0 };
  res.json(bookingStats);
});

// ─── API Routes ──────────────────────────────────────────

// Hent alle klinikker (admin — inkl. Old og Training)
app.get("/api/centers/all", async (req, res) => {
  try {
    const centers = await getAllCenters();
    res.json({ centers });
  } catch (err) {
    console.error("[API] /api/centers/all error:", err.message);
    res.status(500).json({ error: "Kunne ikke hente klinikker" });
  }
});

// Hent tilladte klinikker (public — kun dem admin har valgt)
app.get("/api/centers", async (req, res) => {
  try {
    if (!bookingSettings.enabled) {
      return res.json({ centers: [], disabled: true });
    }
    const all = await getAllCenters();
    const allowed = all.filter(c => bookingSettings.allowedCenterIds.includes(c.id));
    bookingStats.started++; // Tæl at nogen har startet booking-flowet
    res.json({ centers: allowed });
  } catch (err) {
    console.error("[API] /api/centers error:", err.message);
    res.status(500).json({ error: "Kunne ikke hente klinikker" });
  }
});

// Hent ledige tider for en klinik
app.get("/api/slots", async (req, res) => {
  try {
    if (!bookingSettings.enabled) {
      return res.status(403).json({ error: "Booking er slukket" });
    }
    const { center_id } = req.query;
    if (!center_id) return res.status(400).json({ error: "center_id parameter required" });
    if (!bookingSettings.allowedCenterIds.includes(center_id)) {
      return res.status(403).json({ error: "Denne klinik er ikke aktiveret for booking" });
    }
    const slots = await getAvailableSlots(center_id);
    res.json({ slots });
  } catch (err) {
    console.error("[API] /api/slots error:", err.message);
    res.status(500).json({ error: "Kunne ikke hente ledige tider" });
  }
});

// Book gratis konsultation
app.post("/api/book", async (req, res) => {
  try {
    if (!bookingSettings.enabled) {
      return res.status(403).json({ error: "Booking er slukket" });
    }
    const { name, email, phone, centerId, slot } = req.body;
    if (!name || !email || !phone || !centerId || !slot) {
      return res.status(400).json({ error: "Manglende felter" });
    }
    if (!bookingSettings.allowedCenterIds.includes(centerId)) {
      return res.status(403).json({ error: "Denne klinik er ikke aktiveret for booking" });
    }
    const result = await processBooking(
      { name, email, phone },
      null,
      slot,
      centerId
    );
    bookingStats.completed++;
    res.json({ status: "booked", ...result });
  } catch (err) {
    console.error("[API] /api/book error:", err.message);
    res.status(500).json({ error: err.message || "Booking fejlede. Prøv igen." });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    zenotiConfigured: !!process.env.ZENOTI_API_KEY,
    bookingEnabled: bookingSettings.enabled,
    allowedCenters: bookingSettings.allowedCenterIds.length,
  });
});

// ─── Serve static in production ──────────────────────────

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[CeriX] Server running on port ${PORT}`);
  console.log(`[CeriX] Booking: ${bookingSettings.enabled ? "ON" : "OFF"}`);
});
