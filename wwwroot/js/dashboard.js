/*******************************
 *  Auth & page bootstrap
 *******************************/
const me = getAuthUser();
if (!me) {
    window.location.href = "/index.html";
    throw new Error("Not authenticated");
}

const agentChip = qs("#agentChip");
const dateInput = qs("#datePicker");
const list = qs("#ticketList");
const empty = qs("#emptyState");
const newBtn = qs("#newTicketBtn");
const newRequestBtn = qs("#newRequestBtn"); // NEW

agentChip.textContent = me.displayName || me.email || "Me";
dateInput.value = todayLocalYMD();

/*******************************
 *  Copy-to-Excel: button + status (injected next to agent name)
 *******************************/
const rightTopbar = agentChip.parentElement;
const copyBtn = document.createElement("button");
copyBtn.id = "copyTicketsBtn";
copyBtn.type = "button";
copyBtn.className = "btn ghost";
copyBtn.style.padding = "6px 10px";
copyBtn.style.borderRadius = "10px";
copyBtn.style.fontSize = ".95rem";
copyBtn.title = "Copy tickets to clipboard";
copyBtn.textContent = "📋 Copy";

const copyStatus = document.createElement("span");
copyStatus.id = "copyStatus";
copyStatus.style.marginLeft = "6px";
copyStatus.style.color = "var(--muted)";
copyStatus.style.fontSize = ".9rem";
copyStatus.setAttribute("aria-live", "polite");

rightTopbar.appendChild(copyBtn);
rightTopbar.appendChild(copyStatus);

/*******************************
 *  Modal wiring
 *******************************/
const modal = qs("#ticketModal");
const form = qs("#ticketForm");
const statusEl = qs("#ticketStatus");
const tkNumber = qs("#tkNumber");
const tkAction = qs("#tkAction");
const tkActionOther = qs("#tkActionOther");
const tkDesc = qs("#tkDesc");
const tkTimeDisplay = qs("#tkTimeDisplay");  // read-only pill
const submitBtn = qs("#ticketSubmitBtn");
const deleteBtn = qs("#ticketDeleteBtn");
const titleEl = qs("#ticketTitle");

/* ---------- Modes & option/description sets ---------- */
const MODES = { TICKET: "ticket", REQUEST: "request" };
let currentMode = MODES.TICKET;

// Actions shown for each mode
const ACTION_OPTIONS = {
    [MODES.TICKET]: [
        "Resolved",
        "#1",
        "#2",
        "Pending Update",
        "With DTL/TL/SDM",
        "Incorrect Assignment Group",
        "Awaiting vendor/third-party"
    ],
    [MODES.REQUEST]: [
        "Closed Complete",
        "Closed Skipped",
        "Pending",
        "Work in progress",
        "Assigned to",
    ]
};

// Default descriptions per action per mode
const DEFAULT_DESCRIPTIONS = {
    [MODES.TICKET]: {
        "Resolved": "Issue resolved with known fix or confirmed with the user.",
        "#1": "Called User, Left VM & Comment",
        "#2": "Called User, Left VM & Comment",
        "Pending Update": "",
        "With DTL/TL/SDM": "Ticket is with Duty Team Lead / Team Lead / SDM for review.",
        "Incorrect Assignment Group": "Ticket re-assigned to correct team.",
        "Awaiting vendor/third-party": "Waiting for vendor/third-party response.",
        "__other": ""
    },
    [MODES.REQUEST]: {
        "Closed Complete": "",
        "Closed Skipped": "",
        "Pending": "",
        "Work in progress": "",
        "Assigned to": "",
        "__other": ""
    }
};

let editingId = null; // null=create, number=edit

newBtn.addEventListener("click", () => openModalForCreate(MODES.TICKET));
if (newRequestBtn) {
    newRequestBtn.addEventListener("click", () => openModalForCreate(MODES.REQUEST));
}

list.addEventListener("click", (e) => {
    const li = e.target.closest(".ticket-row");
    if (!li) return;
    openModalForEdit(li._ticket);
});

modal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeModal();
});
document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("hidden") && e.key === "Escape") closeModal();
});

/* When the action changes, toggle "__other" input and auto-fill description */
tkAction.addEventListener("change", () => {
    if (tkAction.value === "__other") {
        tkActionOther.classList.remove("hidden");
        tkActionOther.focus();
    } else {
        tkActionOther.classList.add("hidden");
        tkActionOther.value = "";
    }

    const defText = DEFAULT_DESCRIPTIONS[currentMode][tkAction.value];
    if (defText !== undefined) {
        if (!tkDesc.value || isCurrentValueDefaultForAnyMode(tkDesc.value)) {
            tkDesc.value = defText;
        }
    }
});

form.addEventListener("submit", onSubmit);
deleteBtn.addEventListener("click", onDelete);

/*******************************
 *  Initial load & date filter
 *******************************/
dateInput.addEventListener("change", loadTickets);
loadTickets();

/*******************************
 *  Handlers
 *******************************/
async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const ticketNumber = (tkNumber.value || "").trim();
    const action = tkAction.value === "__other"
        ? (tkActionOther.value || "").trim()
        : (tkAction.value || "").trim();
    const description = (tkDesc.value || "").trim();

    if (!ticketNumber || !action) {
        showStatus("Ticket Number and What did you do are required.", true);
        setSaving(false);
        return;
    }

    try {
        if (editingId === null) {
            // CREATE (server sets time = now)
            await jsonFetch("/api/tickets", {
                method: "POST",
                body: { ticketNumber, agentId: me.userId, action, description }
            });
            showStatus("Saved!");
            const today = todayLocalYMD();
            if (dateInput.value !== today) dateInput.value = today;
        } else {
            // EDIT (keep existing time)
            await jsonFetch(`/api/tickets/${editingId}`, {
                method: "PUT",
                body: { ticketNumber, action, description }
            });
            showStatus("Changes saved!");
        }
        await loadTickets();
        setTimeout(closeModal, 150);
    } catch (err) {
        showStatus(err.message || "Error saving ticket", true);
    } finally {
        setSaving(false);
    }
}

async function onDelete() {
    if (editingId == null) return;
    if (!confirm("Delete this ticket entry?")) return;
    setSaving(true);
    try {
        await jsonFetch(`/api/tickets/${editingId}`, { method: "DELETE" });
        await loadTickets();
        closeModal();
    } catch (err) {
        showStatus(err.message || "Error deleting ticket", true);
    } finally {
        setSaving(false);
    }
}

/*******************************
 *  Modal helpers
 *******************************/
function openModalForCreate(mode = MODES.TICKET) {
    currentMode = mode;
    editingId = null;
    titleEl.textContent = mode === MODES.REQUEST ? "New Request" : "New Ticket Action";
    submitBtn.textContent = "Submit";
    deleteBtn.style.display = "none";
    form.reset();
    tkActionOther.classList.add("hidden");

    // Build action options for this mode and set default desc
    populateActionOptions(currentMode);

    updateTimeDisplay(new Date()); // show now in the read-only pill
    showModal();
}

function openModalForEdit(t) {
    const actionVal = t.action || "";
    const isRequestAction = ACTION_OPTIONS[MODES.REQUEST].includes(actionVal);
    currentMode = isRequestAction ? MODES.REQUEST : MODES.TICKET;

    editingId = t.id;
    titleEl.textContent = isRequestAction ? "Edit Request" : "Edit Ticket Action";
    submitBtn.textContent = "Save changes";
    deleteBtn.style.display = "inline-flex";

    tkNumber.value = t.ticketNumber || "";

    // Rebuild options for this mode and try to select existing action/custom
    populateActionOptions(currentMode, actionVal);

    tkDesc.value = t.description || "";
    updateTimeDisplay(parseIsoAsLocal(t.time)); // show existing time
    showModal();
}

function populateActionOptions(mode, selectedValue = "") {
    const opts = ACTION_OPTIONS[mode] || [];
    // rebuild <select>
    tkAction.innerHTML =
        `<option value="" disabled ${selectedValue ? "" : "selected"}>Select an action…</option>` +
        opts.map(v => `<option>${esc(v)}</option>`).join("") +
        `<option value="__other">Other…</option>`;

    // keep/reflect selection
    if (selectedValue) {
        if (opts.includes(selectedValue)) {
            tkAction.value = selectedValue;
            tkActionOther.classList.add("hidden");
            tkActionOther.value = "";
        } else {
            tkAction.value = "__other";
            tkActionOther.classList.remove("hidden");
            tkActionOther.value = selectedValue;
        }
    } else {
        if (opts.length) tkAction.value = opts[0];
    }

    // set default description when switching modes if empty or still defaulty
    const defText = DEFAULT_DESCRIPTIONS[mode][tkAction.value] ?? "";
    if (!tkDesc.value || isCurrentValueDefaultForAnyMode(tkDesc.value)) {
        tkDesc.value = defText;
    }
}

function isCurrentValueDefaultForAnyMode(val) {
    const allDefaults = {
        ...DEFAULT_DESCRIPTIONS[MODES.TICKET],
        ...DEFAULT_DESCRIPTIONS[MODES.REQUEST]
    };
    return Object.values(allDefaults).includes(val);
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

function setSaving(isSaving) {
    submitBtn.disabled = !!isSaving;
    deleteBtn.disabled = !!isSaving;
}

function showStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (isError ? " error" : " success");
}

function updateTimeDisplay(d) {
    const ymd = d.toLocaleDateString();
    const hms = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    tkTimeDisplay.textContent = `${ymd} • ${hms}`;
}

/*******************************
 *  Data loading / rendering
 *******************************/
async function loadTickets() {
    try {
        const rows = await jsonFetch(`/api/tickets/mine?agentId=${encodeURIComponent(me.userId)}&date=${encodeURIComponent(dateInput.value)}`);
        renderList(rows || []);
    } catch (err) {
        renderList([]);
        toast(`Failed to load tickets: ${err.message || err}`, true);
    }
}

function renderList(items) {
    list.innerHTML = "";
    if (!items.length) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    items
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .forEach(t => {
            const li = document.createElement("li");
            li.className = "ticket-row";
            li.dataset.id = t.id;
            li.dataset.action = t.action || "";
            li._ticket = t;

            li.innerHTML = `
        <span class="ticket-num">${esc(t.ticketNumber)}</span>
        <span class="ticket-title">${esc(t.action || "")} – ${esc(t.description || "")}</span>
        <span class="badge time">${formatLocalTime(t.time)}</span>
      `;
            list.appendChild(li);
        });
}

/*******************************
 *  Copy-to-Excel (TSV) logic
 *******************************/
copyBtn.addEventListener("click", copyVisibleTickets);

function clean(v) {
    return (v ?? "").toString().replace(/\r|\n/g, " ").trim();
}

async function copyVisibleTickets() {
    const rows = Array.from(list.querySelectorAll(".ticket-row"));
    if (!rows.length) {
        copyStatus.textContent = "No tickets.";
        setTimeout(() => (copyStatus.textContent = ""), 3000);
        return;
    }

    const agentName = clean(agentChip?.textContent || "Agent");

    const header = ["TicketID", "Agent", "What did you do", "Description", "Time"].join("\t");

    // extract the ticket objects and sort by time ASC (oldest → newest)
    const sortedTickets = rows
        .map(li => li._ticket || {})
        .sort((a, b) => new Date(a.time) - new Date(b.time));

    const lines = sortedTickets.map(t => {
        const ticketId = clean(t.ticketNumber);
        const action = clean(t.action);
        const desc = clean(t.description);
        const timeHhMm = formatLocalTime(t.time);
        return [ticketId, agentName, action, desc, timeHhMm].join("\t");
    });

    const tsv = header + "\r\n" + lines.join("\r\n");

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(tsv);
        } else {
            const ta = document.createElement("textarea");
            ta.value = tsv;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
        }
        copyStatus.textContent = "Copied! Paste into Excel.";
    } catch (e) {
        console.error(e);
        copyStatus.textContent = "Copy failed.";
    } finally {
        setTimeout(() => (copyStatus.textContent = ""), 4000);
    }
}


/*******************************
 *  Helpers
 *******************************/
function getAuthUser() {
    try {
        const raw = localStorage.getItem("authUser");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

function qs(sel, root = document) { return root.querySelector(sel); }
function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function todayLocalYMD() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLocalTime(iso) {
    const d = parseIsoAsLocal(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function parseIsoAsLocal(iso) {
    return new Date(iso);
}

function hasActionOption(value) {
    const opts = Array.from(tkAction.options).map(o => o.value || o.textContent);
    return opts.includes(value);
}

function toast(msg, isErr = false) {
    console[isErr ? "error" : "log"](msg);
}

/*******************************
 *  Fetch helper
 *******************************/
async function jsonFetch(url, { method = "GET", headers = {}, body } = {}) {
    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

    if (!res.ok) {
        const errMsg = isJson
            ? (data?.error || data?.title || JSON.stringify(data))
            : (typeof data === "string" ? data : `HTTP ${res.status}`);
        throw new Error(errMsg || `HTTP ${res.status}`);
    }
    return data;
}
