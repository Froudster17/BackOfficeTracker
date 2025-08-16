/*******************************
 *  Fake data + "logged in" user
 *******************************/
const me = { userId: 1, displayName: "Thomas Froud", email: "thomas@example.com" };

const fakeTickets = [
    {
        id: 1,
        ticketNumber: "INC10001",
        agentId: 1,
        agentName: "Thomas Froud",
        action: "Triage",
        description: "Disabled startup apps",
        time: localIsoNowMinus({ hours: 3 }) // today
    },
    {
        id: 2,
        ticketNumber: "INC10002",
        agentId: 1,
        agentName: "Thomas Froud",
        action: "Called user",
        description: "Left voicemail",
        time: localIsoForDate("2025-08-15T14:10:00") // a past day demo
    }
];

/*******************************
 *  Elements
 *******************************/
const agentChip = document.getElementById("agentChip");
const dateInput = document.getElementById("datePicker");
const list = document.getElementById("ticketList");
const empty = document.getElementById("emptyState");
const newBtn = document.getElementById("newTicketBtn");

agentChip.textContent = me.displayName;

// set date picker = today (LOCAL)
dateInput.value = todayLocalYMD();

/*******************************
 *  Modal wiring
 *******************************/
const modal = document.getElementById("ticketModal");
const form = document.getElementById("ticketForm");
const statusEl = document.getElementById("ticketStatus");
const tkNumber = document.getElementById("tkNumber");
const tkAction = document.getElementById("tkAction");
const tkDesc = document.getElementById("tkDesc");

// open
newBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => tkNumber.focus(), 0);
});

// close on X / Cancel / overlay
modal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeModal();
});
document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("hidden") && e.key === "Escape") closeModal();
});

function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    statusEl.textContent = "";
    statusEl.className = "status";
    form.reset();
}

/*******************************
 *  Submit (FAKE create for now)
 *******************************/
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const ticketNumber = (tkNumber.value || "").trim();
    const action = tkAction.value === "__other"
        ? (tkActionOther.value || "").trim()
        : (tkAction.value || "").trim();
    const description = (tkDesc.value || "").trim();

    if (!ticketNumber || !action) {
        statusEl.textContent = "Ticket Number and What did you do are required.";
        statusEl.classList.add("error");
        return;
    }

    // …the rest stays the same…
    fakeTickets.push({
        id: Date.now(),
        ticketNumber,
        agentId: me.userId,
        agentName: me.displayName,
        action,
        description,
        time: localIsoNow()
    });

    statusEl.textContent = "Saved!";
    statusEl.classList.add("success");

    const today = todayLocalYMD();
    if (dateInput.value !== today) dateInput.value = today;

    loadTickets();
    setTimeout(closeModal, 150);
});

/*******************************
 *  Rendering & filtering
 *******************************/
dateInput.addEventListener("change", loadTickets);
loadTickets();

function loadTickets() {
    const targetYMD = dateInput.value; // "YYYY-MM-DD"
    const mine = fakeTickets
        .filter(t => t.agentId === me.userId && ymdFromLocalIso(t.time) === targetYMD)
        .sort((a, b) => new Date(b.time) - new Date(a.time));

    list.innerHTML = "";
    if (mine.length === 0) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    for (const t of mine) {
        const li = document.createElement("li");
        li.className = "ticket-row";
        li.innerHTML = `
      <span class="ticket-num">${esc(t.ticketNumber)}</span>
      <span class="ticket-title">${esc(t.action)} – ${esc(t.description)}</span>
      <span class="badge">${formatLocalTime(t.time)}</span>
    `;
        list.appendChild(li);
    }
}

/*******************************
 *  Helpers
 *******************************/
function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function todayLocalYMD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// Produce a LOCAL ISO (no trailing Z) like "YYYY-MM-DDTHH:mm:ss"
function localIsoNow() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}:${s}`;
}

// Same, but offset by some amount (for seeding examples)
function localIsoNowMinus({ hours = 0, minutes = 0 } = {}) {
    const d = new Date();
    d.setMinutes(d.getMinutes() - (hours * 60 + minutes));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}:${s}`;
}

function localIsoForDate(isoLocalLike) {
    // Accepts "YYYY-MM-DDTHH:mm:ss" interpreted as local time
    return isoLocalLike;
}

function ymdFromLocalIso(localIso) {
    // localIso e.g. "2025-08-16T12:56:00" (no Z)
    return localIso.slice(0, 10);
}

function formatLocalTime(localIso) {
    const [h, m] = localIso.split("T")[1].split(":");
    return `${h}:${m}`;
}