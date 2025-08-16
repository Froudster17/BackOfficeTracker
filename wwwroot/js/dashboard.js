// Fake test tickets
const fakeTickets = [
    {
        id: 1,
        ticketNumber: "INC10001",
        agentId: 1,
        agentName: "Thomas Froud",
        action: "Triage",
        description: "Disabled startup apps",
        time: "2025-08-16T09:45:00Z"
    },
    {
        id: 2,
        ticketNumber: "INC10002",
        agentId: 1,
        agentName: "Thomas Froud",
        action: "Called user",
        description: "Spoke with user",
        time: "2025-08-16T12:56:00Z"
    },
    {
        id: 3,
        ticketNumber: "INC10003",
        agentId: 2,
        agentName: "Alice Smith",
        action: "Reinstalled printer",
        description: "Printer now working",
        time: "2025-08-15T14:10:00Z"
    }
];

// Pretend this is the logged-in agent
const me = { userId: 1, displayName: "Thomas Froud" };

const agentChip = document.getElementById("agentChip");
agentChip.textContent = me.displayName;

const dateInput = document.getElementById("datePicker");
dateInput.valueAsNumber = Date.now() - (new Date()).getTimezoneOffset() * 60000;

const list = document.getElementById("ticketList");
const empty = document.getElementById("emptyState");

function loadTickets() {
    const selectedDate = dateInput.value; // yyyy-mm-dd
    const target = new Date(selectedDate + "T00:00:00");

    // Filter tickets: mine + same day
    const filtered = fakeTickets.filter(t => {
        const d = new Date(t.time);
        return (
            t.agentId === me.userId &&
            d.getFullYear() === target.getFullYear() &&
            d.getMonth() === target.getMonth() &&
            d.getDate() === target.getDate()
        );
    });

    list.innerHTML = "";
    if (!filtered.length) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    for (const t of filtered) {
        const li = document.createElement("li");
        li.className = "ticket-row";
        li.innerHTML = `
      <span class="ticket-num">${t.ticketNumber}</span>
      <span class="ticket-title">${escapeHtml(t.action)} – ${escapeHtml(t.description)}</span>
      <span class="badge">${new Date(t.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    `;
        list.appendChild(li);
    }
}

dateInput.addEventListener("change", loadTickets);

// util
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[c]));
}

// Initial render
loadTickets();
