// ─────────────────────────────────────────────────────────
// zenoti.js — Zenoti API bridge for CeriX
// Følger Zenoti's 3-step booking flow:
//   1. POST /bookings (opret booking) → booking_id
//   2. GET /bookings/{id}/slots (hent ledige tider)
//   3. PUT /bookings/{id}/slots/reserve (reservér slot)
//   4. POST /bookings/{id}/slots/confirm (bekræft)
// ─────────────────────────────────────────────────────────

const env = () => ({
  base: process.env.ZENOTI_API_URL,
  key: process.env.ZENOTI_API_KEY,
  account: process.env.ZENOTI_ACCOUNT_NAME,
  centerId: process.env.ZENOTI_CENTER_ID,
  service: process.env.ZENOTI_SERVICE_KONSULTATION,
});

const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `apikey ${env().key}`,
  ...(env().account && { "Application-Name": env().account }),
});

// ─── Hent alle klinikker (inkl. Old og Training) ─────────

async function getAllCenters() {
  const res = await fetch(`${env().base}/centers`, { headers: hdrs() });
  const data = await res.json();
  return (data.centers || []).map(c => ({
    id: c.id,
    name: c.name,
    address: c.address_info?.address_1 || "",
    city: c.address_info?.city || "",
    zip: c.address_info?.zip_code || "",
  }));
}

// ─── Hent kun aktive klinikker (filtreret) ───────────────

async function getCenters() {
  const all = await getAllCenters();
  return all.filter(c => !c.name.startsWith("Old") && !c.name.includes("Training"));
}

// ─── 1. Find eller opret guest ───────────────────────────

async function findOrCreateGuest(lead, centerId) {
  const cid = centerId || env().centerId;

  // Søg på email
  const searchRes = await fetch(
    `${env().base}/guests?center_id=${cid}&query=${encodeURIComponent(lead.email)}`,
    { headers: hdrs() }
  );
  const searchData = await searchRes.json();

  if (searchData.guests?.length > 0) {
    return searchData.guests[0].id;
  }

  // Opret ny gæst
  const [firstName, ...rest] = lead.name.trim().split(" ");
  const lastName = rest.join(" ") || "-";

  const createRes = await fetch(`${env().base}/guests`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify({
      center_id: cid,
      personal_info: {
        first_name: firstName,
        last_name: lastName,
        email: lead.email,
        mobile_phone: {
          country_code: 45,
          number: lead.phone.replace(/\D/g, "").replace(/^45/, ""),
        },
      },
    }),
  });

  const created = await createRes.json();
  if (!created.id) throw new Error(`Guest creation failed: ${JSON.stringify(created)}`);
  return created.id;
}

// ─── 2. Opret booking (step 1 i Zenoti flow) ────────────

async function createBooking(guestId, centerId, date) {
  const cid = centerId || env().centerId;
  const res = await fetch(`${env().base}/bookings`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify({
      center_id: cid,
      date: date,
      guests: [{
        id: guestId,
        items: [{
          item: { id: env().service },
          therapist: { Gender: 0 }, // Any
        }],
      }],
    }),
  });

  const data = await res.json();
  const bookingId = data.booking_id || data.id;
  if (!bookingId) throw new Error(`Booking creation failed: ${JSON.stringify(data)}`);
  return bookingId;
}

// ─── 3. Hent ledige slots for en booking ─────────────────

async function getSlotsForBooking(bookingId) {
  const res = await fetch(
    `${env().base}/bookings/${bookingId}/slots`,
    { headers: hdrs() }
  );
  const data = await res.json();
  return data;
}

// ─── 4. Hent ledige tider (næste 5 hverdage) ────────────
// Opretter en midlertidig booking for at hente slots per dag

async function getAvailableSlots(centerId) {
  const cid = centerId || env().centerId;

  // Vi bruger en dummy guest til at hente slots
  // Først find/opret en test guest
  const guestId = await findOrCreateGuest(
    { name: "Slot Check", email: "slots@cerix.dk", phone: "+4500000000" },
    cid
  );

  const slots = [];
  const today = new Date();

  // Check næste 5 hverdage
  for (let i = 0; i < 7 && slots.length < 20; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i + 1);

    // Spring weekender over
    const dow = checkDate.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = checkDate.toISOString().split("T")[0];

    try {
      const bookingId = await createBooking(guestId, cid, dateStr);
      const slotData = await getSlotsForBooking(bookingId);

      // Parse Zenoti slot response
      const daySlots = slotData?.slots || slotData?.Slots || [];
      for (const slot of daySlots) {
        if (slot.Available !== false) {
          const rawTime = slot.Time || slot.time || "";
          // Parse "2026-03-18T10:30:00" → "10:30"
          const time = rawTime.includes("T")
            ? rawTime.split("T")[1].slice(0, 5)
            : rawTime;
          slots.push({
            date: dateStr,
            time,
            bookingId: bookingId,
            slotData: slot,
          });
        }
      }
    } catch (err) {
      console.error(`[Zenoti] Slots for ${dateStr}:`, err.message);
    }
  }

  return slots.slice(0, 15);
}

// ─── 5. Reservér og bekræft en slot ──────────────────────

async function reserveSlot(bookingId, slot) {
  // Reserve
  const resReserve = await fetch(
    `${env().base}/bookings/${bookingId}/slots/reserve`,
    {
      method: "PUT",
      headers: hdrs(),
      body: JSON.stringify({ slot }),
    }
  );
  const reserveData = await resReserve.json();

  // Confirm
  const resConfirm = await fetch(
    `${env().base}/bookings/${bookingId}/slots/confirm`,
    {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({}),
    }
  );
  const confirmData = await resConfirm.json();

  return {
    appointmentId: confirmData.appointment_id || confirmData.id,
    invoiceId: confirmData.invoice_id,
  };
}

// ─── 6. Komplet booking flow ─────────────────────────────

async function processBooking(lead, bookingId, slot, centerId) {
  // Opret/find rigtig guest
  const guestId = await findOrCreateGuest(lead, centerId);

  // Opret ny booking med den rigtige guest
  const cid = centerId || env().centerId;
  const newBookingId = await createBooking(guestId, cid, slot.date);

  // Hent slots for den nye booking og find matchende tid
  const slotData = await getSlotsForBooking(newBookingId);
  const daySlots = slotData?.slots || slotData?.Slots || [];
  const matchingSlot = daySlots.find(s => {
    const raw = s.Time || s.time || "";
    const t = raw.includes("T") ? raw.split("T")[1].slice(0, 5) : raw;
    return t === slot.time;
  });

  if (!matchingSlot) throw new Error("Den valgte tid er ikke længere ledig");

  // Reservér og bekræft
  const result = await reserveSlot(newBookingId, matchingSlot);

  return {
    guestId,
    bookingId: newBookingId,
    ...result,
  };
}

export { getCenters, getAllCenters, getAvailableSlots, processBooking };
