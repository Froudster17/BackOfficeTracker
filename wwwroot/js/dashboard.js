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
dateInput.value = todayLocalYMD(); // set date picker = today (LOCAL)

/*******************************
 *  Modal wiring
 *******************************/
const modal = document.getElementById("ticketModal");
const form = document.getElementById("ticketForm");
const statusEl = document.getElementById("ticketStatus");
const tkNumber = document.getElementById("tkNumber");
const tkAction = document.getElementById("tkAction");
const tkActionOther = document.getElementById("tkActionOther");
const tkDesc = document.getElementById("tkDesc");
const tkTimeDisplay = document.getElementById("tkTimeDisplay");
const tkBumpTime = document.getElementById("tkBumpTime");
const submitBtn = document.getElementById("ticketSubmitBtn");
const deleteBtn = document.getElementById("ticketDeleteBtn");
const titleEl = document.getElementById("ticketTitle");

let editingId = null; // null = create mode

// open create
newBtn.addEventListener("click", () => openModalForCreate());

// open edit when clicking row
list.addEventListener("click", (e) => {
    const li = e.target.closest(".ticket-row");
    if (!li) return;
    const id = Number(li.dataset.id);
    const t = fakeTickets.find(x => x.id === id);
    if (t) openModalForEdit(t);
});

// close on X / Cancel / overlay / Esc
modal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeModal();
});
document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("hidden") && e.key === "Escape") closeModal();
});

function openModalForCreate() {
    editingId = null;
    titleEl.textContent = "New Ticket Action";
    submitBtn.textContent = "Submit";
    deleteBtn.style.display = "none";
    tkNumber.value = "";
    tkAction.value = "";
    tkActionOther.value = "";
    tkActionOther.classList.add("hidden");
    tkDesc.value = "";
    tkBumpTime.checked = true;
    updateTimeDisplay(new Date());
    showModal();
}

function openModalForEdit(t) {
    editingId = t.id;
    titleEl.textContent = "Edit Ticket Action";
    submitBtn.textContent = "Save changes";
    deleteBtn.style.display = "inline-flex";

    tkNumber.value = t.ticketNumber;
    if (hasActionOption(t.action)) {
        tkAction.value = t.action;
        tkActionOther.classList.add("hidden");
        tkActionOther.value = "";
    } else {
        tkAction.value = "__other";
        tkActionOther.classList.remove("hidden");
        tkActionOther.value = t.action;
    }
    tkDesc.value = t.description;
    tkBumpTime.checked = false;
    updateTimeDisplay(new Date(t.time));

    showModal();
}

function showModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => tkNumber.focus(), 0);
}

function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    statusEl.textContent = "";
    statusEl.className = "status";
    form.reset();
}

/*******************************
 *  Form logic
 *******************************/
tkAction.addEventListener("change", () => {
    if (tkAction.value === "__other") {
        tkActionOther.classList.remove("hidden");
        tkActionOther.focus();
    } else {
        tkActionOther.classList.add("hidden");
        tkActionOther.value = "";
    }
});

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

    if (editingId === null) {
        // CREATE
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
    } else {
        // EDIT
        const t = fakeTickets.find(x => x.id === editingId);
        if (t) {
            t.ticketNumber = ticketNumber;
            t.action = action;
            t.description = description;
            if (tkBumpTime.checked) t.time = localIsoNow();
        }
        statusEl.textContent = "Changes saved!";
    }
    statusEl.classList.add("success");

    const today = todayLocalYMD();
    if (tkBumpTime.checked && dateInput.value !== today) dateInput.value = today;

    loadTickets();
    setTimeout(closeModal, 150);
});

// Delete
deleteBtn.addEventListener("click", () => {
    if (editingId === null) return;
    const ok = confirm("Delete this ticket entry?");
    if (!ok) return;
    const idx = fakeTickets.findIndex(x => x.id === editingId);
    if (idx >= 0) fakeTickets.splice(idx, 1);
    loadTickets();
    closeModal();
});

/*******************************
 *  Rendering & filtering
 *******************************/
dateInput.addEventListener("change", loadTickets);
loadTickets();

function loadTickets() {
    const targetYMD = dateInput.value;
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
        li.dataset.id = t.id;
        li.dataset.action = t.action;
        li.innerHTML = `
      <span class="ticket-num">${esc(t.ticketNumber)}</span>
      <span class="ticket-title">${esc(t.action)} – ${esc(t.description)}</span>
      <span class="badge time">${formatLocalTime(t.time)}</span>
    `;
        list.appendChild(li);
    }
}

/*******************************
 *  Helpers
 *******************************/
function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) }
function todayLocalYMD() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function localIsoNow() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; }
function localIsoNowMinus({ hours = 0, minutes = 0 } = {}) { const d = new Date(); d.setMinutes(d.getMinutes() - (hours * 60 + minutes)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; }
function localIsoForDate(iso) { return iso; }
function ymdFromLocalIso(localIso) { return localIso.slice(0, 10); }
function formatLocalTime(localIso) { const [h, m] = localIso.split("T")[1].split(":"); return `${h}:${m}`; }
function updateTimeDisplay(d) { tkTimeDisplay.textContent = `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`; }
function hasActionOption(value) { return Array.from(tkAction.options).some(o => (o.value || o.textContent) === value); }
