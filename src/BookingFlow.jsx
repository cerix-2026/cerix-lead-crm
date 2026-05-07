import { useState, useEffect } from "react";

// ─── Theme (same as CRM) ────────────────────────────────
const T = {
  bg:     "#F7F5F2",
  surf:   "#FFFFFF",
  surfB:  "#F0EDE8",
  border: "#E5E0D8",
  text:   "#1A1714",
  muted:  "#8A8278",
  dim:    "#C4BDB4",
  accent: "#C17B3C",
  accentL:"#F5EAD9",
  accentD:"#9A5E28",
  green:  "#2D7D52",
  greenL: "#E2F4EC",
  red:    "#C0392B",
};

// ─── Helpers ─────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
  const months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
}

function groupSlotsByDate(slots) {
  const groups = {};
  for (const slot of slots) {
    if (!groups[slot.date]) groups[slot.date] = [];
    groups[slot.date].push(slot);
  }
  return Object.entries(groups);
}

// ─── Step 1: Vælg klinik ────────────────────────────────

function StepCenter({ centers, selected, onSelect, loading }) {
  if (loading) return (
    <div style={{ textAlign:"center", padding:"40px 0", color:T.muted }}>
      <div style={{ fontSize:24, marginBottom:8 }}>⏳</div>
      Henter klinikker...
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:4,
        fontFamily:"'Outfit',sans-serif" }}>Vælg klinik</h2>
      <p style={{ fontSize:14, color:T.muted, marginBottom:20 }}>
        Hvor vil du gerne booke din gratis konsultation?
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {centers.map(c => (
          <div key={c.id} onClick={() => onSelect(c)}
            style={{
              padding:"14px 16px", borderRadius:12, cursor:"pointer",
              background: selected?.id===c.id ? T.accentL : T.surf,
              border: `2px solid ${selected?.id===c.id ? T.accent : T.border}`,
              transition:"all 0.15s",
            }}>
            <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{c.name}</div>
            <div style={{ fontSize:12, color:T.muted }}>{c.address}, {c.zip} {c.city}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Vælg tid ───────────────────────────────────

function StepTime({ centerId, selectedSlot, onSelect }) {
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/slots?center_id=${centerId}`)
      .then(r => r.json())
      .then(data => {
        setSlots(data.slots || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Kunne ikke hente ledige tider");
        setLoading(false);
      });
  }, [centerId]);

  if (loading) return (
    <div style={{ textAlign:"center", padding:"40px 0", color:T.muted }}>
      <div style={{ fontSize:24, marginBottom:8 }}>⏳</div>
      Henter ledige tider...
    </div>
  );

  if (error) return (
    <div style={{ textAlign:"center", padding:"40px 0", color:T.red }}>
      <div style={{ fontSize:24, marginBottom:8 }}>⚠️</div>
      {error}
    </div>
  );

  if (slots && slots.length === 0) return (
    <div style={{ textAlign:"center", padding:"40px 0", color:T.muted }}>
      <div style={{ fontSize:24, marginBottom:8 }}>📅</div>
      Ingen ledige tider de næste 7 dage.<br/>
      Ring til os for at aftale en tid.
    </div>
  );

  const grouped = groupSlotsByDate(slots);

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:4,
        fontFamily:"'Outfit',sans-serif" }}>Vælg tid</h2>
      <p style={{ fontSize:14, color:T.muted, marginBottom:20 }}>
        Ledige tider til gratis konsultation
      </p>
      {grouped.map(([date, daySlots]) => (
        <div key={date} style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:8 }}>
            {formatDate(date)}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {daySlots.map((slot, i) => {
              const display = slot.timeDisplay || (slot.time.includes("T") ? slot.time.split("T")[1].slice(0,5) : slot.time);
              const isSelected = selectedSlot?.time===slot.time && selectedSlot?.date===slot.date;
              return (
                <div key={i} onClick={() => onSelect(slot)}
                  style={{
                    padding:"10px 16px", borderRadius:10, cursor:"pointer",
                    background: isSelected ? T.accentL : T.surf,
                    border: `2px solid ${isSelected ? T.accent : T.border}`,
                    transition:"all 0.15s", minWidth:70, textAlign:"center",
                  }}>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{display}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 3: Oplysninger ────────────────────────────────

function StepInfo({ info, onChange }) {
  const field = (label, key, type="text", placeholder="", required=true) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:500, color:T.muted,
        marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>
        {label}{required && <span style={{ color:T.red, marginLeft:2 }}>*</span>}
      </label>
      <input type={type} value={info[key]} onChange={e => onChange(key, e.target.value)}
        placeholder={placeholder}
        style={{
          width:"100%", padding:"12px 14px", borderRadius:10,
          border:`1.5px solid ${T.border}`, fontSize:15, color:T.text,
          background:T.surf, outline:"none", boxSizing:"border-box",
          fontFamily:"inherit",
        }} />
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:4,
        fontFamily:"'Outfit',sans-serif" }}>Dine oplysninger</h2>
      <p style={{ fontSize:14, color:T.muted, marginBottom:20 }}>
        Udfyld dine oplysninger for at booke din gratis konsultation
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div style={{ gridColumn:"1 / -1" }}>
          {field("Fulde navn", "name", "text", "Anna Jensen")}
        </div>
        {field("Email", "email", "email", "anna@email.dk")}
        {field("Telefon", "phone", "tel", "+45 12 34 56 78")}
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:12, fontWeight:500, color:T.muted,
          marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>
          Køn
        </label>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { value:"female", label:"Kvinde" },
            { value:"male", label:"Mand" },
            { value:"other", label:"Andet" },
          ].map(opt => (
            <div key={opt.value} onClick={() => onChange("gender", opt.value)}
              style={{
                flex:1, padding:"11px 14px", borderRadius:10, cursor:"pointer",
                textAlign:"center", fontSize:14, fontWeight:500,
                background: info.gender===opt.value ? T.accentL : T.surf,
                border: `1.5px solid ${info.gender===opt.value ? T.accent : T.border}`,
                color: info.gender===opt.value ? T.accentD : T.text,
                transition:"all 0.15s",
              }}>
              {opt.label}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize:11, color:T.dim, lineHeight:1.5, marginTop:8 }}>
        Vi bruger dine oplysninger udelukkende til at oprette din booking hos CeriX.
      </p>
    </div>
  );
}

// ─── Step 4: Bekræft ────────────────────────────────────

function StepConfirm({ center, slot, info }) {
  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:4,
        fontFamily:"'Outfit',sans-serif" }}>Bekræft booking</h2>
      <p style={{ fontSize:14, color:T.muted, marginBottom:20 }}>
        Tjek at alt ser rigtigt ud
      </p>
      <div style={{ background:T.surfB, borderRadius:12, padding:"18px 20px" }}>
        {[
          ["Behandling", "Gratis konsultation"],
          ["Klinik", center?.name || "—"],
          ["Dato", slot ? formatDate(slot.date) : "—"],
          ["Tidspunkt", slot ? (slot.timeDisplay || (slot.time.includes("T") ? slot.time.split("T")[1].slice(0,5) : slot.time)) : "—"],
          ["Navn", info.name],
          ["Email", info.email],
          ["Telefon", info.phone],
          ["Køn", info.gender === "female" ? "Kvinde" : info.gender === "male" ? "Mand" : info.gender === "other" ? "Andet" : "—"],
        ].map(([label, value], i) => (
          <div key={i} style={{
            display:"flex", justifyContent:"space-between", padding:"10px 0",
            borderBottom: i < 7 ? `1px solid ${T.border}` : "none",
          }}>
            <span style={{ fontSize:13, color:T.muted }}>{label}</span>
            <span style={{ fontSize:13, fontWeight:600, color:T.text, textAlign:"right" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Success ────────────────────────────────────

function StepSuccess({ info, center }) {
  return (
    <div style={{ textAlign:"center", padding:"20px 0" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
      <h2 style={{ fontSize:22, fontWeight:700, color:T.text, marginBottom:8,
        fontFamily:"'Outfit',sans-serif" }}>Booking bekræftet!</h2>
      <p style={{ fontSize:14, color:T.muted, lineHeight:1.6, maxWidth:300, margin:"0 auto" }}>
        Tak {info.name.split(" ")[0]}! Du modtager en bekræftelse
        på <strong>{info.email}</strong>.
      </p>
      <div style={{ marginTop:20, padding:"14px 20px", background:T.accentL, borderRadius:12,
        fontSize:13, color:T.accentD, fontWeight:500 }}>
        Din gratis konsultation hos CeriX {center?.name}
      </div>
      <div style={{ marginTop:12, padding:"14px 20px", background:T.greenL, borderRadius:12,
        fontSize:13, color:T.green, fontWeight:500 }}>
        Vi glæder os til at se dig!
      </div>
    </div>
  );
}

// ─── Main Booking Flow ───────────────────────────────────

export default function BookingFlow() {
  const [step, setStep] = useState(0);
  const [centers, setCenters] = useState([]);
  const [centersLoading, setCentersLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [info, setInfo] = useState({ name:"", email:"", phone:"", gender:"" });
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState(null);

  const [disabled, setDisabled] = useState(false);

  // Fetch centers on mount
  useEffect(() => {
    fetch("/api/centers")
      .then(r => r.json())
      .then(data => {
        if (data.disabled) setDisabled(true);
        setCenters(data.centers || []);
        setCentersLoading(false);
      })
      .catch(() => setCentersLoading(false));
  }, []);

  const updateInfo = (key, val) => setInfo(prev => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 0) return !!selectedCenter;
    if (step === 1) return !!selectedSlot;
    if (step === 2) return info.name && info.email && info.phone;
    if (step === 3) return true;
    return false;
  };

  const handleBook = async () => {
    setBooking(true);
    setBookError(null);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: info.name,
          email: info.email,
          phone: info.phone,
          gender: info.gender,
          centerId: selectedCenter.id,
          slot: selectedSlot,
        }),
      });
      const data = await res.json();
      if (data.status === "booked") {
        setStep(4);
      } else {
        setBookError(data.error || "Noget gik galt. Prøv igen.");
      }
    } catch {
      setBookError("Forbindelsesfejl. Prøv igen.");
    }
    setBooking(false);
  };

  const next = () => {
    if (step === 3) { handleBook(); return; }
    setStep(s => s + 1);
  };

  const STEPS = ["Klinik", "Tid", "Oplysninger", "Bekræft"];

  return (
    <div style={{
      minHeight:"100vh", background:T.bg, fontFamily:"'DM Sans',sans-serif",
      display:"flex", flexDirection:"column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus { outline:none; border-color:#C17B3C !important; }
      `}</style>

      {/* Header */}
      <div style={{
        padding:"16px 20px", background:T.surf, borderBottom:`1px solid ${T.border}`,
        textAlign:"center",
      }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.text,
          fontFamily:"'Outfit',sans-serif", letterSpacing:-0.5 }}>CeriX</div>
        <div style={{ fontSize:10, color:T.muted, letterSpacing:2, textTransform:"uppercase" }}>
          Gratis konsultation
        </div>
      </div>

      {/* Progress */}
      {step < 4 && (
        <div style={{ padding:"16px 20px 0", maxWidth:480, margin:"0 auto", width:"100%" }}>
          <div style={{ display:"flex", gap:6 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ flex:1, textAlign:"center" }}>
                <div style={{
                  height:4, borderRadius:2, marginBottom:6,
                  background: i <= step ? T.accent : T.border,
                  transition:"background 0.3s",
                }} />
                <span style={{
                  fontSize:10, fontWeight: i === step ? 600 : 400,
                  color: i <= step ? T.accent : T.dim,
                  textTransform:"uppercase", letterSpacing:0.5,
                }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{
        flex:1, padding:"24px 20px", maxWidth:480, margin:"0 auto", width:"100%",
      }}>
        {disabled && (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
            <h2 style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:8,
              fontFamily:"'Outfit',sans-serif" }}>Booking ikke tilgængelig</h2>
            <p style={{ fontSize:14, color:T.muted, lineHeight:1.6 }}>
              Online booking er ikke åben lige nu.<br/>
              Ring til os for at booke en tid.
            </p>
          </div>
        )}
        {!disabled && step === 0 && <StepCenter centers={centers} selected={selectedCenter}
          onSelect={c => { setSelectedCenter(c); setSelectedSlot(null); }}
          loading={centersLoading} />}
        {step === 1 && <StepTime centerId={selectedCenter?.id} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />}
        {step === 2 && <StepInfo info={info} onChange={updateInfo} />}
        {step === 3 && <StepConfirm center={selectedCenter} slot={selectedSlot} info={info} />}
        {step === 4 && <StepSuccess info={info} center={selectedCenter} />}
      </div>

      {/* Footer buttons */}
      {!disabled && step < 4 && (
        <div style={{
          padding:"16px 20px", background:T.surf, borderTop:`1px solid ${T.border}`,
          maxWidth:480, margin:"0 auto", width:"100%",
          display:"flex", gap:10,
        }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{
                flex:"0 0 auto", padding:"14px 20px", borderRadius:12, fontSize:14,
                fontWeight:500, cursor:"pointer", background:T.surfB, color:T.text,
                border:`1px solid ${T.border}`,
              }}>
              Tilbage
            </button>
          )}
          <button onClick={next} disabled={!canNext() || booking}
            style={{
              flex:1, padding:"14px 20px", borderRadius:12, fontSize:15,
              fontWeight:700, cursor: canNext() && !booking ? "pointer" : "default",
              background: canNext() ? T.accent : T.dim, color:"#fff",
              border:"none", opacity: booking ? 0.7 : 1,
              transition:"all 0.2s",
            }}>
            {booking ? "Booker..." : step === 3 ? "Book konsultation" : "Fortsæt"}
          </button>
        </div>
      )}

      {/* Error */}
      {bookError && (
        <div style={{
          padding:"12px 20px", background:T.red+"15", color:T.red,
          textAlign:"center", fontSize:13, fontWeight:500,
        }}>
          {bookError}
        </div>
      )}
    </div>
  );
}
