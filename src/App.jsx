import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ────────────────────────────────────────────
const MOCK_LEADS = [
  { id:"L001", name:"Sofie Andersen",   email:"sofie@gmail.com",   phone:"+45 20 11 22 33", source:"quiz",      treatment:"botox",        concern:"concern_forehead", experience:"first_timer",    status:"nurturing", score:80, createdAt:"2025-06-10T08:22:00Z", lastEvent:"Email åbnet",      tags:["botox","first_timer","concern_forehead"], zenotiguestId:"zen-001", events:[{t:"Quiz gennemført","d":"10. jun 08:22"},{t:"SMS sendt","d":"10. jun 08:23"},{t:"Email åbnet","d":"10. jun 09:41"},{t:"Klik på booking-link","d":"11. jun 14:02"}] },
  { id:"L002", name:"Mette Christensen",email:"mette.c@hotmail.dk", phone:"+45 21 33 44 55", source:"instagram", treatment:"fillers",       concern:"concern_volume",    experience:"experienced",    status:"hot",       score:90, createdAt:"2025-06-11T11:05:00Z", lastEvent:"Klik på booking", tags:["fillers","experienced"], zenotiguestId:"zen-002", events:[{t:"Instagram DM klik","d":"11. jun 11:05"},{t:"Quiz gennemført","d":"11. jun 11:09"},{t:"Email åbnet","d":"11. jun 12:00"},{t:"Klik på booking-link","d":"12. jun 09:15"}] },
  { id:"L003", name:"Anna Nielsen",     email:"anna.n@live.dk",     phone:"+45 22 55 66 77", source:"quiz",      treatment:"fedtfrysning",  concern:"concern_jaw",       experience:"some_experience",status:"new",       score:75, createdAt:"2025-06-12T14:30:00Z", lastEvent:"Quiz gennemført",  tags:["fedtfrysning","some_experience"], zenotiguestId:null,      events:[{t:"Quiz gennemført","d":"12. jun 14:30"},{t:"SMS sendt","d":"12. jun 14:31"}] },
  { id:"L004", name:"Louise Hansen",    email:"l.hansen@work.dk",   phone:"+45 23 77 88 99", source:"form",      treatment:"hud",           concern:"concern_tired",     experience:"experienced",    status:"booked",    score:65, createdAt:"2025-06-08T09:00:00Z", lastEvent:"Booking bekræftet",tags:["hud","experienced","booked"], zenotiguestId:"zen-004", events:[{t:"Form udfyldt","d":"8. jun 09:00"},{t:"Email sendt","d":"8. jun 09:01"},{t:"Booking bekræftet","d":"9. jun 10:30"}] },
  { id:"L005", name:"Camilla Sørensen", email:"cam@gmail.com",       phone:"+45 24 99 00 11", source:"instagram", treatment:"laser",         concern:"concern_volume",    experience:"first_timer",    status:"lost",      score:40, createdAt:"2025-06-05T16:45:00Z", lastEvent:"Ingen åbning",     tags:["laser","first_timer"], zenotiguestId:null,      events:[{t:"Instagram DM klik","d":"5. jun 16:45"},{t:"SMS sendt","d":"5. jun 16:46"},{t:"Email ikke åbnet (dag 2)","d":"7. jun 09:00"}] },
  { id:"L006", name:"Sara Madsen",      email:"sara.m@gmail.com",   phone:"+45 25 12 34 56", source:"quiz",      treatment:"botox",         concern:"concern_forehead",  experience:"some_experience",status:"nurturing",  score:72, createdAt:"2025-06-13T10:15:00Z", lastEvent:"Email åbnet",      tags:["botox","some_experience"], zenotiguestId:"zen-006", events:[{t:"Quiz gennemført","d":"13. jun 10:15"},{t:"SMS sendt","d":"13. jun 10:16"},{t:"Email åbnet","d":"13. jun 14:22"}] },
];

const MOCK_QUIZ = {
  id:"Q001", title:"CeriX Behandlingsanbefaling",
  questions:[
    { id:"q1", type:"single", text:"Hvad er dit primære ønske?", options:["Reducer rynker og fine linjer","Mere fylde og volumen","Reducer genstridige fedtdepoter","Stramme og forynge huden","Fjerne karsprængninger eller pigment"], tag:"treatment" },
    { id:"q2", type:"single", text:"Hvad bekymrer dig mest?",    options:["Ser træt eller trist ud","Rynker i panden eller rundt om øjnene","Kæbelinje eller halshud","Taber volumen i ansigtet generelt"], tag:"concern" },
    { id:"q3", type:"single", text:"Har du prøvet kosmetiske behandlinger før?", options:["Ja, jeg har erfaring med behandlinger","Ja, men kun et par gange","Nej, det bliver min første gang"], tag:"experience" },
  ]
};

const MOCK_FLOWS = [
  { id:"F001", name:"Botox nurture (7 dage)", trigger:"treatment=botox", active:true, steps:[
    { id:"s1", type:"sms",   delay:0,       delayUnit:"min",  subject:"",                  body:"Hej {navn}! Tak for din quiz 🌟 Vi anbefaler botox. Book gratis konsultation: {bookingLink} /CeriX" },
    { id:"s2", type:"email", delay:0,       delayUnit:"min",  subject:"Din personlige botox-anbefaling fra CeriX",  body:"Hej {navn},\n\nBaseret på dine svar er botox sandsynligvis den rette behandling for dig.\n\nHos CeriX har vi specialister der hver dag udfører botox med naturlige resultater...\n\n[Book gratis konsultation]" },
    { id:"s3", type:"email", delay:2,       delayUnit:"days", subject:"3 ting du skal vide om botox",              body:"Hej {navn},\n\nVi ved at mange tøver med botox første gang. Her er de 3 mest stillede spørgsmål:\n\n1. Gør det ondt?\n2. Ser det naturligt ud?\n3. Hvad koster det?\n..." },
    { id:"s4", type:"email", delay:4,       delayUnit:"days", subject:"Før/efter: Se virkelige resultater",         body:"Hej {navn},\n\nSe her hvad vores kunder siger om deres botox-behandling hos CeriX..." },
    { id:"s5", type:"sms",   delay:6,       delayUnit:"days", subject:"",                  body:"Hej {navn}! Har du booket din gratis konsultation endnu? Vi har ledige tider denne uge → {bookingLink}" },
  ]},
  { id:"F002", name:"Fillers nurture (7 dage)", trigger:"treatment=fillers", active:true, steps:[
    { id:"s1", type:"sms",   delay:0,       delayUnit:"min",  subject:"",                  body:"Hej {navn}! Tak for din quiz ✨ Vi anbefaler fillers. Book gratis konsultation: {bookingLink} /CeriX" },
    { id:"s2", type:"email", delay:0,       delayUnit:"min",  subject:"Din fillers-anbefaling fra CeriX",          body:"Hej {navn},\n\nFillers er den rette løsning til at genskabe volumen og kontur naturligt..." },
    { id:"s3", type:"email", delay:3,       delayUnit:"days", subject:"Botox vs fillers — hvad er forskellen?",    body:"Hej {navn},\n\nMange spørger: hvad er forskellen? Her er den korte version..." },
  ]},
  { id:"F003", name:"Booking bekræftelse",     trigger:"status=booked",        active:true, steps:[
    { id:"s1", type:"sms",   delay:0,       delayUnit:"min",  subject:"",                  body:"Bekræftet! Din konsultation hos CeriX {klinik} er booket {dato} kl. {tid}. Vi glæder os! /CeriX" },
    { id:"s2", type:"email", delay:0,       delayUnit:"min",  subject:"Booking bekræftet — CeriX konsultation",   body:"Hej {navn},\n\nDin konsultation er bekræftet...\n\nAdresse: {klinikAdresse}\nTid: {dato} kl. {tid}" },
    { id:"s3", type:"sms",   delay:-1,      delayUnit:"days", subject:"",                  body:"Hej {navn}! Husk din konsultation i morgen kl. {tid} hos CeriX {klinik} 🌟 /CeriX" },
  ]},
];

// ─── THEME ────────────────────────────────────────────────
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
  redL:   "#FDECEA",
  blue:   "#2563EB",
  blueL:  "#EFF6FF",
  purple: "#6D28D9",
  purpleL:"#F3EFFE",
};

// ─── HELPERS ──────────────────────────────────────────────
const STATUS_CFG = {
  new:       { label:"Ny",         bg:T.blueL,   color:T.blue   },
  nurturing: { label:"Nurturing",  bg:T.accentL, color:T.accent },
  hot:       { label:"Varm 🔥",    bg:"#FFF4E0", color:"#C87C00"},
  booked:    { label:"Booket ✓",   bg:T.greenL,  color:T.green  },
  lost:      { label:"Tabt",       bg:"#F3F4F6", color:"#6B7280"},
};
const SOURCE_CFG = {
  quiz:      { label:"Quiz",      color:T.purple },
  instagram: { label:"Instagram", color:"#E1306C"},
  form:      { label:"Form",      color:T.blue   },
};
const STEP_CFG = {
  email: { label:"Email", color:T.blue,   icon:"✉" },
  sms:   { label:"SMS",   color:T.green,  icon:"💬" },
};

const Badge = ({ children, bg, color, small }) => (
  <span style={{ display:"inline-block", padding: small?"2px 7px":"3px 10px", borderRadius:100,
    fontSize: small?10:11, fontWeight:600, background:bg, color, letterSpacing:0.3 }}>
    {children}
  </span>
);
const Score = ({ v }) => {
  const c = v>=80?T.green:v>=60?T.accent:T.red;
  return <span style={{ fontWeight:700, color:c, fontFamily:"'DM Mono',monospace", fontSize:13 }}>{v}</span>;
};
const Pill = ({ children, color=T.muted }) => (
  <span style={{ display:"inline-block", padding:"1px 7px", borderRadius:4, fontSize:10,
    background:color+"18", color, fontWeight:500, marginRight:3, marginBottom:2 }}>{children}</span>
);

// ─── TOP NAV ──────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"dashboard", label:"Dashboard",    icon:"◈" },
  { id:"leads",     label:"Leads",        icon:"◉" },
  { id:"quiz",      label:"Quiz Builder", icon:"◎" },
  { id:"flows",     label:"Email & SMS",  icon:"◆" },
];

function Sidebar({ view, setView, counts }) {
  return (
    <div style={{ width:220, background:T.surf, borderRight:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column", flexShrink:0, height:"100vh", position:"sticky", top:0 }}>
      <div style={{ padding:"20px 20px 16px" }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.text, fontFamily:"'Outfit',sans-serif",
          letterSpacing:-0.5 }}>CeriX</div>
        <div style={{ fontSize:10, color:T.muted, letterSpacing:2, textTransform:"uppercase",
          marginTop:1 }}>Lead Engine</div>
      </div>
      <nav style={{ flex:1, padding:"0 8px" }}>
        {NAV_ITEMS.map(n => {
          const active = view===n.id;
          return (
            <div key={n.id} onClick={()=>setView(n.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                borderRadius:8, marginBottom:2, cursor:"pointer",
                background: active?T.accentL:"transparent",
                color: active?T.accentD:T.muted,
                fontWeight: active?600:400, fontSize:13,
                transition:"all 0.15s" }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              <span style={{ flex:1 }}>{n.label}</span>
              {n.id==="leads" && counts?.leads > 0 &&
                <span style={{ fontSize:10, background:T.accent, color:"#fff", padding:"1px 6px",
                  borderRadius:10, fontWeight:700 }}>{counts.leads}</span>}
            </div>
          );
        })}
      </nav>
      <div style={{ padding:"12px 20px 20px", borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:11, color:T.dim }}>Zenoti</div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
          <div style={{ width:6, height:6, borderRadius:3, background:T.green }}/>
          <span style={{ fontSize:11, color:T.muted }}>Forbundet</span>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────
function KpiCard({ label, value, sub, color=T.accent }) {
  return (
    <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12,
      padding:"18px 20px", flex:1, minWidth:0 }}>
      <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1.5,
        marginBottom:8, fontWeight:500 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color, fontFamily:"'Outfit',sans-serif",
        lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:T.muted, marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:12, color:T.muted }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{value}</span>
      </div>
      <div style={{ height:6, background:T.surfB, borderRadius:3 }}>
        <div style={{ height:6, borderRadius:3, background:color, width:`${(value/max)*100}%`,
          transition:"width 0.6s ease" }}/>
      </div>
    </div>
  );
}

function Dashboard({ leads, setView }) {
  const total    = leads.length;
  const newCount = leads.filter(l=>l.status==="new").length;
  const booked   = leads.filter(l=>l.status==="booked").length;
  const hot      = leads.filter(l=>l.status==="hot").length;
  const convRate = Math.round((booked/total)*100);

  const byTreatment = ["botox","fillers","fedtfrysning","hud","laser"].map(t=>({
    t, count: leads.filter(l=>l.treatment===t).length
  })).sort((a,b)=>b.count-a.count);

  const recentLeads = [...leads].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,4);

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:T.text, fontFamily:"'Outfit',sans-serif",
          marginBottom:4 }}>Dashboard</h1>
        <div style={{ fontSize:13, color:T.muted }}>Oversigt over dit lead pipeline</div>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <KpiCard label="Totale leads"    value={total}    sub="Alle kilder samlet"       color={T.text} />
        <KpiCard label="Nye i dag"       value={newCount} sub="Afventer første kontakt"  color={T.blue} />
        <KpiCard label="Varme leads 🔥"  value={hot}      sub="Klar til opfølgning"      color="#C87C00"/>
        <KpiCard label="Bookede"         value={booked}   sub={`${convRate}% konv.-rate`} color={T.green}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 22px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:16 }}>Leads per behandling</div>
          {byTreatment.map(({t,count})=>(
            <MiniBar key={t} label={t.charAt(0).toUpperCase()+t.slice(1)} value={count}
              max={Math.max(...byTreatment.map(x=>x.count))} color={T.accent} />
          ))}
        </div>

        <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 22px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:16 }}>Status-fordeling</div>
          {Object.entries(STATUS_CFG).map(([k,v])=>{
            const c = leads.filter(l=>l.status===k).length;
            return c > 0 ? (
              <div key={k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                <Badge bg={v.bg} color={v.color} small>{v.label}</Badge>
                <span style={{ fontWeight:700, color:T.text, fontSize:14 }}>{c}</span>
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12, padding:"20px 22px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>Seneste leads</div>
          <button onClick={()=>setView("leads")} style={{ fontSize:12, color:T.accent,
            background:"none", border:"none", cursor:"pointer", fontWeight:500 }}>
            Se alle →
          </button>
        </div>
        {recentLeads.map(l=>(
          <div key={l.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0",
            borderBottom:`1px solid ${T.border}` }}>
            <div style={{ width:32, height:32, borderRadius:16, background:T.accentL, display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:T.accent,
              flexShrink:0 }}>{l.name[0]}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text, whiteSpace:"nowrap",
                overflow:"hidden", textOverflow:"ellipsis" }}>{l.name}</div>
              <div style={{ fontSize:11, color:T.muted }}>{l.treatment} · {l.lastEvent}</div>
            </div>
            <Badge bg={STATUS_CFG[l.status].bg} color={STATUS_CFG[l.status].color} small>
              {STATUS_CFG[l.status].label}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LEADS CRM ────────────────────────────────────────────
function LeadDetail({ lead, onClose, onStatusChange }) {
  const [tab, setTab] = useState("profil");
  if (!lead) return null;
  const sc = STATUS_CFG[lead.status];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", zIndex:100,
      display:"flex", justifyContent:"flex-end" }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ width:440, background:T.surf, height:"100vh", overflowY:"auto",
        borderLeft:`1px solid ${T.border}`, animation:"slideIn 0.2s ease" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:20, background:T.accentL,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, fontWeight:800, color:T.accent }}>{lead.name[0]}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{lead.name}</div>
            <div style={{ fontSize:12, color:T.muted }}>{lead.email}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            fontSize:18, cursor:"pointer", color:T.muted, padding:"4px 8px" }}>✕</button>
        </div>

        <div style={{ padding:"0 24px" }}>
          <div style={{ display:"flex", gap:4, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
            {["profil","tidslinje","handlinger"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"6px 14px", borderRadius:6, fontSize:12, fontWeight:500, cursor:"pointer",
                background: tab===t?T.accentL:"none", color: tab===t?T.accentD:T.muted, border:"none" }}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          {tab==="profil" && (
            <div style={{ padding:"16px 0" }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1,
                  marginBottom:8 }}>Status</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {Object.entries(STATUS_CFG).map(([k,v])=>(
                    <div key={k} onClick={()=>onStatusChange(lead.id, k)} style={{
                      padding:"5px 12px", borderRadius:100, fontSize:12, cursor:"pointer",
                      background: lead.status===k?v.bg:T.surfB,
                      color: lead.status===k?v.color:T.muted,
                      fontWeight: lead.status===k?600:400,
                      border:`1px solid ${lead.status===k?v.color+"44":T.border}`,
                      transition:"all 0.15s" }}>
                      {v.label}
                    </div>
                  ))}
                </div>
              </div>

              {[
                ["Lead score",   <Score v={lead.score}/>],
                ["Kilde",        <Badge bg={SOURCE_CFG[lead.source]?.color+"18"} color={SOURCE_CFG[lead.source]?.color} small>{SOURCE_CFG[lead.source]?.label??lead.source}</Badge>],
                ["Behandling",   lead.treatment],
                ["Bekymring",    lead.concern.replace("concern_","")],
                ["Erfaring",     lead.experience],
                ["Telefon",      lead.phone],
                ["Zenoti ID",    lead.zenotiguestId ?? <span style={{color:T.red,fontSize:11}}>Ikke oprettet endnu</span>],
              ].map(([l,v],i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between",
                  padding:"10px 0", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
                  <span style={{ fontSize:12, color:T.muted }}>{l}</span>
                  <span style={{ fontSize:13, color:T.text, fontWeight:500, textAlign:"right" }}>{v}</span>
                </div>
              ))}

              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1,
                  marginBottom:8 }}>Tags</div>
                <div>{lead.tags.map(t=><Pill key={t} color={T.accent}>{t}</Pill>)}</div>
              </div>
            </div>
          )}

          {tab==="tidslinje" && (
            <div style={{ padding:"16px 0" }}>
              {lead.events.map((e,i)=>(
                <div key={i} style={{ display:"flex", gap:12, marginBottom:16, position:"relative" }}>
                  <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:10, height:10, borderRadius:5, background:T.accent, marginTop:3 }}/>
                    {i<lead.events.length-1 && <div style={{ width:1, flex:1, background:T.border, marginTop:4 }}/>}
                  </div>
                  <div style={{ flex:1, paddingBottom:i<lead.events.length-1?4:0 }}>
                    <div style={{ fontSize:13, color:T.text, fontWeight:500 }}>{e.t}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{e.d}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab==="handlinger" && (
            <div style={{ padding:"16px 0", display:"flex", flexDirection:"column", gap:8 }}>
              {[
                ["Send booking-link via SMS","💬",T.green],
                ["Send email manuelt","✉",T.blue],
                ["Book konsultation i Zenoti","◈",T.accent],
                ["Marker som tabt","✕",T.red],
              ].map(([label,icon,color],i)=>(
                <button key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
                  background:color+"12", border:`1px solid ${color}33`, borderRadius:10, cursor:"pointer",
                  fontSize:13, color, fontWeight:500, textAlign:"left" }}>
                  <span>{icon}</span>{label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadsCRM({ leads, setLeads }) {
  const [search, setSearch]     = useState("");
  const [filterStatus, setFS]   = useState("all");
  const [filterSource, setFSrc] = useState("all");
  const [selectedLead, setSel]  = useState(null);

  const filtered = leads.filter(l=>{
    const q = search.toLowerCase();
    const matchQ = !q || l.name.toLowerCase().includes(q) || l.email.includes(q) || l.treatment.includes(q);
    const matchS = filterStatus==="all" || l.status===filterStatus;
    const matchSrc = filterSource==="all" || l.source===filterSource;
    return matchQ && matchS && matchSrc;
  });

  const handleStatusChange = (id, status) => {
    setLeads(prev=>prev.map(l=>l.id===id?{...l,status}:l));
    setSel(prev=>prev?.id===id?{...prev,status}:prev);
  };

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:T.text, fontFamily:"'Outfit',sans-serif",
            marginBottom:4 }}>Leads</h1>
          <div style={{ fontSize:13, color:T.muted }}>{filtered.length} af {leads.length} leads</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Søg navn, email, behandling..."
          style={{ flex:"1 1 200px", padding:"8px 12px", borderRadius:8,
            border:`1px solid ${T.border}`, background:T.surf, fontSize:13, color:T.text,
            outline:"none", minWidth:0 }}/>

        <select value={filterStatus} onChange={e=>setFS(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border}`,
            background:T.surf, fontSize:13, color:T.text, cursor:"pointer" }}>
          <option value="all">Alle statusser</option>
          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={filterSource} onChange={e=>setFSrc(e.target.value)}
          style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${T.border}`,
            background:T.surf, fontSize:13, color:T.text, cursor:"pointer" }}>
          <option value="all">Alle kilder</option>
          {Object.entries(SOURCE_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:T.surfB }}>
              {["Navn","Kilde","Behandling","Status","Score","Sidst set",""].map((h,i)=>(
                <th key={i} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600,
                  color:T.muted, textTransform:"uppercase", letterSpacing:1,
                  borderBottom:`1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l=>{
              const sc = STATUS_CFG[l.status];
              const src = SOURCE_CFG[l.source];
              return (
                <tr key={l.id} onClick={()=>setSel(l)}
                  style={{ cursor:"pointer", transition:"background 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfB}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:15, background:T.accentL,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight:700, color:T.accent, flexShrink:0 }}>{l.name[0]}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{l.name}</div>
                        <div style={{ fontSize:11, color:T.muted }}>{l.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    {src && <Badge bg={src.color+"18"} color={src.color} small>{src.label}</Badge>}
                  </td>
                  <td style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.text }}>{l.treatment}</span>
                  </td>
                  <td style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <Badge bg={sc.bg} color={sc.color} small>{sc.label}</Badge>
                  </td>
                  <td style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <Score v={l.score}/>
                  </td>
                  <td style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.muted }}>{l.lastEvent}</span>
                  </td>
                  <td style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:18, color:T.dim }}>›</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0 && (
          <div style={{ padding:"40px", textAlign:"center", color:T.muted, fontSize:13 }}>
            Ingen leads matcher dit filter
          </div>
        )}
      </div>

      {selectedLead && (
        <LeadDetail lead={selectedLead} onClose={()=>setSel(null)}
          onStatusChange={handleStatusChange}/>
      )}
    </div>
  );
}

// ─── QUIZ BUILDER ─────────────────────────────────────────
function QuizBuilder() {
  const [quiz, setQuiz]   = useState(MOCK_QUIZ);
  const [saved, setSaved] = useState(false);

  const addQ = () => {
    const newQ = { id:`q${Date.now()}`, type:"single", text:"Nyt spørgsmål", options:["Mulighed 1"], tag:"custom" };
    setQuiz(q=>({ ...q, questions:[...q.questions, newQ] }));
  };
  const removeQ = id => setQuiz(q=>({ ...q, questions:q.questions.filter(x=>x.id!==id) }));
  const updateQ = (id, field, val) => setQuiz(q=>({
    ...q, questions:q.questions.map(x=>x.id===id?{...x,[field]:val}:x)
  }));
  const addOpt = id => updateQ(id, "options", [...quiz.questions.find(x=>x.id===id).options, "Ny mulighed"]);
  const updateOpt = (id,i,val) => updateQ(id,"options",quiz.questions.find(x=>x.id===id).options.map((o,j)=>j===i?val:o));
  const removeOpt = (id,i) => updateQ(id,"options",quiz.questions.find(x=>x.id===id).options.filter((_,j)=>j!==i));

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2000); };

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:T.text, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>
            Quiz Builder
          </h1>
          <div style={{ fontSize:13, color:T.muted }}>Byg din behandlings-quiz</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={save} style={{ padding:"9px 20px", borderRadius:8, fontSize:13,
            fontWeight:600, cursor:"pointer", background: saved?T.green:T.accent,
            color:"#fff", border:"none", transition:"background 0.3s" }}>
            {saved?"✓ Gemt":"Gem quiz"}
          </button>
        </div>
      </div>

      <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12,
        padding:"18px 20px", marginBottom:16 }}>
        <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>
          Quiz titel
        </div>
        <input value={quiz.title} onChange={e=>setQuiz(q=>({...q,title:e.target.value}))}
          style={{ width:"100%", fontSize:16, fontWeight:600, color:T.text, border:"none",
            background:"none", outline:"none", fontFamily:"'Outfit',sans-serif" }}/>
      </div>

      {quiz.questions.map((q,qi)=>(
        <div key={q.id} style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12,
          padding:"18px 20px", marginBottom:12, position:"relative" }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:14 }}>
            <div style={{ width:24, height:24, borderRadius:6, background:T.accentL, display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800,
              color:T.accent, flexShrink:0, marginTop:2 }}>{qi+1}</div>
            <input value={q.text} onChange={e=>updateQ(q.id,"text",e.target.value)}
              style={{ flex:1, fontSize:14, fontWeight:600, color:T.text, border:"none",
                background:"none", outline:"none" }}/>
            <button onClick={()=>removeQ(q.id)} style={{ background:"none", border:"none",
              color:T.muted, cursor:"pointer", fontSize:16, padding:"0 4px",
              opacity:quiz.questions.length===1?0.3:1 }}>✕</button>
          </div>

          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <div style={{ fontSize:11, color:T.muted, alignSelf:"center" }}>Tag:</div>
            <input value={q.tag} onChange={e=>updateQ(q.id,"tag",e.target.value)}
              style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border}`,
                fontSize:12, color:T.accent, background:T.accentL, fontWeight:600, outline:"none", width:120 }}/>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {q.options.map((opt,i)=>(
              <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ width:16, height:16, borderRadius:8, border:`1.5px solid ${T.dim}`,
                  flexShrink:0 }}/>
                <input value={opt} onChange={e=>updateOpt(q.id,i,e.target.value)}
                  style={{ flex:1, padding:"7px 10px", borderRadius:6, border:`1px solid ${T.border}`,
                    fontSize:13, color:T.text, background:T.surfB, outline:"none" }}/>
                <button onClick={()=>removeOpt(q.id,i)} style={{ background:"none", border:"none",
                  color:T.muted, cursor:"pointer", fontSize:14, padding:"0 4px",
                  opacity:q.options.length===1?0.3:1 }}>✕</button>
              </div>
            ))}
            <button onClick={()=>addOpt(q.id)} style={{ alignSelf:"flex-start", marginTop:4,
              padding:"5px 12px", borderRadius:6, fontSize:12, color:T.accent,
              background:T.accentL, border:"none", cursor:"pointer", fontWeight:500 }}>
              + Tilføj mulighed
            </button>
          </div>
        </div>
      ))}

      <button onClick={addQ} style={{ width:"100%", padding:"14px", borderRadius:10,
        fontSize:13, fontWeight:600, color:T.accent, background:T.accentL,
        border:`1.5px dashed ${T.accent}66`, cursor:"pointer" }}>
        + Tilføj nyt spørgsmål
      </button>
    </div>
  );
}

// ─── FLOW EDITOR ──────────────────────────────────────────
function FlowStep({ step, idx, onChange, onRemove }) {
  const cfg = STEP_CFG[step.type];
  return (
    <div style={{ display:"flex", gap:12, marginBottom:12, position:"relative" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:cfg.color+"18",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, color:cfg.color, border:`1px solid ${cfg.color}33` }}>{cfg.icon}</div>
        <div style={{ width:1, flex:1, background:T.border, marginTop:4 }}/>
      </div>

      <div style={{ flex:1, background:T.surf, border:`1px solid ${T.border}`,
        borderRadius:10, padding:"14px 16px", marginBottom:4 }}>
        <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap" }}>
          <select value={step.type} onChange={e=>onChange({...step,type:e.target.value})}
            style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border}`,
              fontSize:12, fontWeight:600, color:cfg.color, background:cfg.color+"12", cursor:"pointer" }}>
            <option value="email">✉ Email</option>
            <option value="sms">💬 SMS</option>
          </select>

          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:11, color:T.muted }}>Forsinkelse:</span>
            <input type="number" value={step.delay} onChange={e=>onChange({...step,delay:+e.target.value})}
              style={{ width:54, padding:"4px 8px", borderRadius:6, border:`1px solid ${T.border}`,
                fontSize:12, textAlign:"center", outline:"none" }}/>
            <select value={step.delayUnit} onChange={e=>onChange({...step,delayUnit:e.target.value})}
              style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, cursor:"pointer" }}>
              <option value="min">min</option>
              <option value="hours">timer</option>
              <option value="days">dage</option>
            </select>
          </div>
          <button onClick={onRemove} style={{ marginLeft:"auto", background:"none", border:"none",
            color:T.muted, cursor:"pointer", fontSize:14 }}>✕</button>
        </div>

        {step.type==="email" && (
          <input value={step.subject} onChange={e=>onChange({...step,subject:e.target.value})}
            placeholder="Emne..."
            style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:`1px solid ${T.border}`,
              fontSize:12, color:T.text, background:T.surfB, outline:"none", marginBottom:6,
              boxSizing:"border-box" }}/>
        )}
        <textarea value={step.body} onChange={e=>onChange({...step,body:e.target.value})}
          placeholder="Beskedtekst... Brug {navn}, {bookingLink}, {behandling} som variabler"
          rows={step.type==="sms"?2:4}
          style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:`1px solid ${T.border}`,
            fontSize:12, color:T.text, background:T.surfB, outline:"none", resize:"vertical",
            fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.5 }}/>
        <div style={{ marginTop:6, display:"flex", gap:4, flexWrap:"wrap" }}>
          {["{navn}","{bookingLink}","{behandling}","{klinik}","{dato}"].map(v=>(
            <span key={v} onClick={()=>onChange({...step,body:step.body+v})}
              style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:T.surfB,
                color:T.muted, cursor:"pointer", border:`1px solid ${T.border}`,
                fontFamily:"'DM Mono',monospace" }}>{v}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowEditor() {
  const [flows, setFlows]       = useState(MOCK_FLOWS);
  const [activeId, setActiveId] = useState(flows[0].id);
  const [saved, setSaved]       = useState(false);
  const flow = flows.find(f=>f.id===activeId);

  const updateFlow = fn => setFlows(fs=>fs.map(f=>f.id===activeId?fn(f):f));
  const updateStep = (id,step) => updateFlow(f=>({...f,steps:f.steps.map(s=>s.id===id?step:s)}));
  const removeStep = id => updateFlow(f=>({...f,steps:f.steps.filter(s=>s.id!==id)}));
  const addStep = type => updateFlow(f=>({
    ...f, steps:[...f.steps, { id:`s${Date.now()}`, type, delay:1, delayUnit:"days", subject:"", body:"" }]
  }));
  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2000); };

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:T.text, fontFamily:"'Outfit',sans-serif", marginBottom:4 }}>
            Email & SMS Flows
          </h1>
          <div style={{ fontSize:13, color:T.muted }}>Automatiserede sekvenser per lead-type</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setFlows(fs=>[...fs,{
            id:`F${Date.now()}`, name:"Nyt flow", trigger:"", active:false, steps:[]
          }])} style={{ padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:500,
            cursor:"pointer", background:T.surf, color:T.text, border:`1px solid ${T.border}` }}>
            + Nyt flow
          </button>
          <button onClick={save} style={{ padding:"9px 20px", borderRadius:8, fontSize:13,
            fontWeight:600, cursor:"pointer", background:saved?T.green:T.accent,
            color:"#fff", border:"none", transition:"background 0.3s" }}>
            {saved?"✓ Gemt":"Gem flow"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16 }}>
        {/* Flow list */}
        <div>
          {flows.map(f=>(
            <div key={f.id} onClick={()=>setActiveId(f.id)}
              style={{ padding:"12px 14px", borderRadius:10, marginBottom:6, cursor:"pointer",
                background: f.id===activeId?T.accentL:T.surf,
                border: `1px solid ${f.id===activeId?T.accent+"44":T.border}`,
                transition:"all 0.15s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:600,
                  color:f.id===activeId?T.accentD:T.text, maxWidth:160,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.name}</div>
                <div onClick={e=>{e.stopPropagation();setFlows(fs=>fs.map(x=>x.id===f.id?{...x,active:!x.active}:x))}}
                  style={{ width:28, height:16, borderRadius:8, cursor:"pointer",
                    background:f.active?T.green:T.dim, position:"relative", transition:"background 0.2s" }}>
                  <div style={{ position:"absolute", top:2, width:12, height:12, borderRadius:6,
                    background:"#fff", transition:"left 0.2s",
                    left:f.active?14:2 }}/>
                </div>
              </div>
              <div style={{ fontSize:11, color:T.muted, fontFamily:"'DM Mono',monospace" }}>{f.trigger||"—"}</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{f.steps.length} trin</div>
            </div>
          ))}
        </div>

        {/* Step editor */}
        <div>
          <div style={{ background:T.surf, border:`1px solid ${T.border}`, borderRadius:12,
            padding:"16px 18px", marginBottom:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:5 }}>Flow navn</div>
                <input value={flow.name} onChange={e=>updateFlow(f=>({...f,name:e.target.value}))}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:`1px solid ${T.border}`,
                    fontSize:13, color:T.text, outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:5 }}>
                  Trigger (fx <span style={{fontFamily:"monospace"}}>treatment=botox</span>)
                </div>
                <input value={flow.trigger} onChange={e=>updateFlow(f=>({...f,trigger:e.target.value}))}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:`1px solid ${T.border}`,
                    fontSize:13, color:T.text, outline:"none", fontFamily:"'DM Mono',monospace",
                    boxSizing:"border-box" }}/>
              </div>
            </div>
          </div>

          {flow.steps.length===0 && (
            <div style={{ textAlign:"center", padding:"40px", color:T.muted, fontSize:13,
              background:T.surf, borderRadius:12, border:`1.5px dashed ${T.border}` }}>
              Ingen trin endnu — tilføj dit første trin nedenfor
            </div>
          )}

          {flow.steps.map((s,i)=>(
            <FlowStep key={s.id} step={s} idx={i}
              onChange={step=>updateStep(s.id,step)}
              onRemove={()=>removeStep(s.id)}/>
          ))}

          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            {["email","sms"].map(type=>(
              <button key={type} onClick={()=>addStep(type)}
                style={{ flex:1, padding:"12px", borderRadius:10, fontSize:13, fontWeight:600,
                  cursor:"pointer", color:STEP_CFG[type].color,
                  background:STEP_CFG[type].color+"12",
                  border:`1.5px dashed ${STEP_CFG[type].color}55` }}>
                + {STEP_CFG[type].icon} {STEP_CFG[type].label}-trin
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────
export default function App() {
  const [view,  setView]  = useState("dashboard");
  const [leads, setLeads] = useState(MOCK_LEADS);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes slideIn { from { transform:translateX(100%); opacity:0 } to { transform:translateX(0); opacity:1 } }
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus, textarea:focus, select:focus { outline:none; border-color:#C17B3C !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#C4BDB4; border-radius:2px; }
      `}</style>

      <Sidebar view={view} setView={setView}
        counts={{ leads: leads.filter(l=>l.status==="new").length }}/>

      <main style={{ flex:1, minWidth:0, overflowY:"auto", maxHeight:"100vh" }}>
        {view==="dashboard" && <Dashboard leads={leads} setView={setView}/>}
        {view==="leads"     && <LeadsCRM  leads={leads} setLeads={setLeads}/>}
        {view==="quiz"      && <QuizBuilder/>}
        {view==="flows"     && <FlowEditor/>}
      </main>
    </div>
  );
}
