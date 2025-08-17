/*******************************
 *  Auth & page bootstrap
 *******************************/
const me = getAuthUser();
if (!me) {
    // no auth -> back to login
    window.location.href = "/index.html";
    throw new Error("Not authenticated");
}

const agentChip = qs("#agentChip");
const dateInput = qs("#datePicker");
const list = qs("#ticketList");
const empty = qs("#emptyState");
const newBtn = qs("#newTicketBtn");

agentChip.textContent = me.displayName || me.email || "Me";
dateInput.value = todayLocalYMD(); // default = today

/*******************************
 *  Copy-to-Excel: button + status (injected next to agent name)
 *******************************/
const rightTopbar = agentChip.parentElement; // .right container
const copyBtn = document.createElement("button");
copyBtn.id = "copyTicketsBtn";
copyBtn.type = "button";
copyBtn.className = "btn ghost";
copyBtn.style.padding = "6px 10px";         // tiny style so it fits the chip nicely
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
const tkTimeDisplay = qs("#tkTimeDisplay");
const tkBumpTime = qs("#tkBumpTime");
const submitBtn = qs("#ticketSubmitBtn");
const deleteBtn = qs("#ticketDeleteBtn");
const titleEl = qs("#ticketTitle");

let editingId = null; // null=create, number=edit

newBtn.addEventListener("click", openModalForCreate);
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

tkAction.addEventListener("change", () => {
    if (tkAction.value === "__other") {
        tkActionOther.classList.remove("hidden");
        tkActionOther.focus();
    } else {
        tkActionOther.classList.add("hidden");
        tkActionOther.value = "";
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
            // CREATE
            await jsonFetch("/api/tickets", {
                method: "POST",
                body: { ticketNumber, agentId: me.userId, action, description }
            });
            showStatus("Saved!");
            // After creation, ensure date is today so new item is visible
            const today = todayLocalYMD();
            if (dateInput.value !== today) dateInput.value = today;
        } else {
            // EDIT
            await jsonFetch(`/api/tickets/${editingId}`, {
                method: "PUT",
                body: {
                    ticketNumber,
                    action,
                    description,
                    updateTimeNow: !!tkBumpTime.checked
                }
            });
            showStatus("Changes saved!");
            if (tkBumpTime.checked) {
                const today = todayLocalYMD();
                if (dateInput.value !== today) dateInput.value = today;
            }
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
function openModalForCreate() {
    editingId = null;
    titleEl.textContent = "New Ticket Action";
    submitBtn.textContent = "Submit";
    deleteBtn.style.display = "none";
    form.reset();
    tkActionOther.classList.add("hidden");
    tkBumpTime.checked = true;
    updateTimeDisplay(new Date());
    showModal();
}

function openModalForEdit(t) {
    editingId = t.id;
    titleEl.textContent = "Edit Ticket Action";
    submitBtn.textContent = "Save changes";
    deleteBtn.style.display = "inline-flex";

    tkNumber.value = t.ticketNumber || "";

    if (hasActionOption(t.action)) {
        tkAction.value = t.action;
        tkActionOther.classList.add("hidden");
        tkActionOther.value = "";
    } else {
        tkAction.value = "__other";
        tkActionOther.classList.remove("hidden");
        tkActionOther.value = t.action || "";
    }

    tkDesc.value = t.description || "";
    tkBumpTime.checked = false;
    updateTimeDisplay(parseIsoAsLocal(t.time));
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

    // Expect each item to include: id, ticketNumber, action, description, time
    items
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .forEach(t => {
            const li = document.createElement("li");
            li.className = "ticket-row";
            li.dataset.id = t.id;
            li.dataset.action = t.action || "";
            li._ticket = t; // keep original object for editing & export

            li.innerHTML = `
        <span class="ticket-num">${esc(t.ticketNumber)}</span>
        <span class="ticket-title">${esc(t.action || "")} – ${esc(t.description || "")}</span>
        <span class="badge time">${formatLocalTime(t.time)}</span>
      `;
            list.appendChild(li);
        });
}

/*******************************
 *  Copy-to-Excel (TSV) logic — robust for Excel paste
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

    // Header in your requested order
    const header = [
        "TicketID",
        "Agent",
        "What did you do",
        "Description",
        "Time"
    ].join("\t");

    const lines = rows.map(li => {
        const t = li._ticket || {};
        const ticketId = clean(t.ticketNumber);
        const action = clean(t.action);
        const desc = clean(t.description);
        const timeHhMm = formatLocalTime(t.time);

        return [ticketId, agentName, action, desc, timeHhMm].join("\t");
    });

    // Use CRLF for Excel friendliness
    const tsv = header + "\r\n" + lines.join("\r\n");

    try {
        await (navigator.clipboard?.writeText
            ? navigator.clipboard.writeText(tsv)
            : (function () {
                const ta = document.createElement("textarea");
                ta.value = tsv;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                ta.remove();
            })());
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
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

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
    // Works for "YYYY-MM-DDTHH:mm:ss[.fff][Z]" or without Z (both common from APIs)
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
        // Common API error shapes: { error: "..." } or validation arrays
        const errMsg = isJson
            ? (data?.error || data?.title || JSON.stringify(data))
            : (typeof data === "string" ? data : `HTTP ${res.status}`);
        throw new Error(errMsg || `HTTP ${res.status}`);
    }
    return data;
}
