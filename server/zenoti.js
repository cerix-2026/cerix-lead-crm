// ─────────────────────────────────────────────────────────
// zenoti.js — Zenoti API bridge for CeriX
// Følger Zenoti's officielle booking flow:
//   1. POST /bookings (opret booking) → booking_id
//   2. GET /bookings/{id}/slots (hent ledige tider)
//   3. POST /bookings/{id}/slots/reserve (reservér slot)
//   4. POST /bookings/{id}/slots/confirm (bekræft)
//
// SAFETY: Når ZENOTI_TEST_MODE=true bruges KUN training-centres
// ─────────────────────────────────────────────────────────

const env = () => ({
  base: process.env.ZENOTI_API_URL,
  key: process.env.ZENOTI_API_KEY,
  account: process.env.ZENOTI_ACCOUNT_NAME,
  centerId: process.env.ZENOTI_CENTER_ID,
  service: process.env.ZENOTI_SERVICE_KONSULTATION,
  testMode: process.env.ZENOTI_TEST_MODE === "true",
  testCenterId: process.env.ZENOTI_TEST_CENTER_ID,
});

const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `apikey ${env().key}`,
  ...(env().account && { "Application-Name": env().account }),
});

// ─── Test-mode safeguard ─────────────────────────────────
// Forhindrer at booking-kald rammer live centres under udvikling

const TRAINING_CENTER_IDS = [
  "05bfadbe-1711-4174-a267-c257d74e45dc", // Old - Training - Aalborg
  "89f42481-9b5e-4f09-8406-80d675f6fc2a", // Old - Training 2 - Aarhus
  "9f0f9028-eab4-4482-a2b4-2fae1eaaf104", // Old - TRG 3 - Hospital
  "fb63cf4a-982a-45fd-b56b-fd1da4ea5c6b", // Old - Training 4 - CeriX institute
];

function assertSafeCenter(centerId) {
  if (!env().testMode) return; // Production mode — all centres allowed
  if (!TRAINING_CENTER_IDS.includes(centerId)) {
    throw new Error(
      `[SAFETY] Test-mode er aktiv. Kan kun booke i training-centres. ` +
      `Forsøgte: ${centerId}. Tilladte: ${TRAINING_CENTER_IDS.join(", ")}`
    );
  }
}

function getEffectiveCenterId(requestedCenterId) {
  if (env().testMode) {
    // I test-mode: brug altid test-center uanset hvad der anmodes
    const testCenter = env().testCenterId || TRAINING_CENTER_IDS[0];
    console.log(`[Zenoti] TEST MODE: Bruger training center ${testCenter} i stedet for ${requestedCenterId || "default"}`);
    return testCenter;
  }
  return requestedCenterId || env().centerId;
}

// ─── Hent alle klinikker (inkl. Old og Training) ─────────

async function getAllCenters() {
  const res = await fetch(`${env().base}/centers`, { headers: hdrs() });
  if (!res.ok) throw new Error(`Zenoti /centers fejlede: ${res.status}`);
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
  if (env().testMode) {
    // I test mode: vis kun training centres
    return all.filter(c => TRAINING_CENTER_IDS.includes(c.id));
  }
  return all.filter(c => !c.name.startsWith("Old") && !c.name.includes("Training"));
}

// ─── 1. Find eller opret guest ───────────────────────────

async function findOrCreateGuest(lead, centerId) {
  const cid = getEffectiveCenterId(centerId);

  // Søg på email
  const searchRes = await fetch(
    `${env().base}/guests?center_id=${cid}&query=${encodeURIComponent(lead.email)}`,
    { headers: hdrs() }
  );
  if (!searchRes.ok) {
    throw new Error(`Zenoti guest search fejlede: ${searchRes.status}`);
  }
  const searchData = await searchRes.json();

  if (searchData.guests?.length > 0) {
    console.log(`[Zenoti] Fundet eksisterende guest: ${searchData.guests[0].id}`);
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

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(`Guest creation fejlede (${createRes.status}): ${errBody}`);
  }

  const created = await createRes.json();
  if (!created.id) throw new Error(`Guest creation returnerede ingen id: ${JSON.stringify(created)}`);
  console.log(`[Zenoti] Oprettet ny guest: ${created.id}`);
  return created.id;
}

// ─── 2. Opret booking (Step 1 i Zenoti flow) ────────────
// POST /v1/bookings → { id: "booking_id" }

async function createBooking(guestId, centerId, date) {
  const cid = getEffectiveCenterId(centerId);
  assertSafeCenter(cid);

  console.log(`[Zenoti] Opretter booking: guest=${guestId}, center=${cid}, date=${date}`);

  const res = await fetch(`${env().base}/bookings`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify({
      center_id: cid,
      date: date,
      is_only_catalog_employees: true,
      guests: [{
        id: guestId,
        items: [{
          item: { id: env().service },
          therapist: { Gender: 0 }, // 0=Any, 1=Male, 2=Female, 3=Specific
        }],
      }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Booking creation fejlede (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const bookingId = data.id || data.booking_id;
  if (!bookingId) throw new Error(`Booking creation returnerede ingen id: ${JSON.stringify(data)}`);
  console.log(`[Zenoti] Booking oprettet: ${bookingId}`);
  return bookingId;
}

// ─── 3. Hent ledige slots for en booking ─────────────────
// GET /v1/bookings/{booking_id}/slots → { slots: [...] }

async function getSlotsForBooking(bookingId) {
  const res = await fetch(
    `${env().base}/bookings/${bookingId}/slots?check_future_day_availability=true`,
    { headers: hdrs() }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Slot retrieval fejlede (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data;
}

// ─── 4. Hent ledige tider (næste 5 hverdage) ────────────

async function getAvailableSlots(centerId) {
  const cid = getEffectiveCenterId(centerId);
  assertSafeCenter(cid);

  // Brug en system-guest til at hente slots (påvirker ikke rigtige kunder)
  const guestId = await findOrCreateGuest(
    { name: "Slot Check", email: "slots@cerix.dk", phone: "+4500000000" },
    cid
  );

  const slots = [];
  const today = new Date();

  // Check næste 7 dage (op til 5 hverdage)
  for (let i = 0; i < 10 && slots.length < 20; i++) {
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
          slots.push({
            date: dateStr,
            time: rawTime, // Behold fuld ISO datetime til reserve-step
            timeDisplay: rawTime.includes("T")
              ? rawTime.split("T")[1].slice(0, 5)
              : rawTime,
            bookingId: bookingId,
            price: slot.SalePrice || 0,
          });
        }
      }
    } catch (err) {
      console.error(`[Zenoti] Slots for ${dateStr}:`, err.message);
    }
  }

  return slots.slice(0, 15);
}

// ─── 5. Reservér en slot ─────────────────────────────────
// POST /v1/bookings/{booking_id}/slots/reserve
// Body: { slot_time: "2026-05-10T10:30:00" }

async function reserveSlot(bookingId, slotTime) {
  console.log(`[Zenoti] Reserverer slot: booking=${bookingId}, time=${slotTime}`);

  const res = await fetch(
    `${env().base}/bookings/${bookingId}/slots/reserve`,
    {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        slot_time: slotTime,
        create_invoice: false,
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Slot reservation fejlede (${res.status}): ${errBody}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`Reservation fejl: ${data.error.message || JSON.stringify(data.error)}`);
  }

  console.log(`[Zenoti] Slot reserveret. Udløber: ${data.expiry_time}`);
  return {
    isReserved: data.is_reserved,
    reservationId: data.reservation_id,
    expiryTime: data.expiry_time,
    invoices: data.invoices,
  };
}

// ─── 6. Bekræft booking ──────────────────────────────────
// POST /v1/bookings/{booking_id}/slots/confirm

async function confirmBooking(bookingId, notes) {
  console.log(`[Zenoti] Bekræfter booking: ${bookingId}`);

  const res = await fetch(
    `${env().base}/bookings/${bookingId}/slots/confirm`,
    {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        notes: notes || "Gratis konsultation — booket via CeriX Lead CRM",
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Booking confirmation fejlede (${res.status}): ${errBody}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`Confirmation fejl: ${data.error.message || JSON.stringify(data.error)}`);
  }

  console.log(`[Zenoti] Booking bekræftet! Invoice: ${data.invoice?.invoice_id}`);
  return {
    isConfirmed: data.is_confirmed,
    invoiceId: data.invoice?.invoice_id,
    appointmentId: data.invoice?.items?.[0]?.appointment_id,
    therapist: data.invoice?.items?.[0]?.therapist,
    startTime: data.invoice?.items?.[0]?.start_time,
    endTime: data.invoice?.items?.[0]?.end_time,
  };
}

// ─── 7. Komplet booking flow ─────────────────────────────

async function processBooking(lead, _bookingId, slot, centerId) {
  const cid = getEffectiveCenterId(centerId);
  assertSafeCenter(cid);

  console.log(`[Zenoti] === BOOKING FLOW START ===`);
  console.log(`[Zenoti] Guest: ${lead.name} (${lead.email})`);
  console.log(`[Zenoti] Center: ${cid}, Slot: ${slot.date} ${slot.time}`);

  // Step 1: Find/opret rigtig guest
  const guestId = await findOrCreateGuest(lead, cid);

  // Step 2: Opret booking med den rigtige guest
  const bookingId = await createBooking(guestId, cid, slot.date);

  // Step 3: Hent slots og find matchende tid
  const slotData = await getSlotsForBooking(bookingId);
  const daySlots = slotData?.slots || slotData?.Slots || [];

  // Match på slot_time (fuld datetime)
  const slotTime = slot.time.includes("T")
    ? slot.time
    : `${slot.date}T${slot.time}:00`;

  const matchingSlot = daySlots.find(s => {
    const raw = s.Time || s.time || "";
    return raw === slotTime || raw.startsWith(slotTime);
  });

  if (!matchingSlot) {
    const availableTimes = daySlots.slice(0, 5).map(s => s.Time || s.time).join(", ");
    throw new Error(
      `Den valgte tid (${slotTime}) er ikke længere ledig. ` +
      `Tilgængelige: ${availableTimes || "ingen"}`
    );
  }

  // Step 4: Reservér slot (POST med slot_time)
  const reserveResult = await reserveSlot(bookingId, matchingSlot.Time || matchingSlot.time);

  if (!reserveResult.isReserved) {
    throw new Error("Kunne ikke reservere tiden. Prøv en anden tid.");
  }

  // Step 5: Bekræft booking
  const confirmResult = await confirmBooking(bookingId);

  console.log(`[Zenoti] === BOOKING FLOW COMPLETE ===`);

  return {
    guestId,
    bookingId,
    ...confirmResult,
  };
}

export { getCenters, getAllCenters, getAvailableSlots, processBooking };
