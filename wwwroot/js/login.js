// --- element refs (keep the IDs in your HTML matching these) ---
const form = document.getElementById("loginForm");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const peekBtn = document.querySelector(".peek"); // optional

// Toggle password visibility (if the button exists)
if (peekBtn) {
    peekBtn.addEventListener("click", () => {
        const isPw = passwordEl.type === "password";
        passwordEl.type = isPw ? "text" : "password";
        peekBtn.setAttribute("aria-label", isPw ? "Hide password" : "Show password");
    });
}

// Simple JSON fetch helper
async function jsonFetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = text ? JSON.parse(text) : null;
    if (!res.ok) {
        // try to surface a friendly error from server
        const msg = (data && (data.error || data.message)) || text || res.statusText;
        throw new Error(msg);
    }
    return data;
}

// Form submit handler
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // quick client-side checks
    const email = (emailEl.value || "").trim();
    const password = passwordEl.value || "";
    if (!email || !password) {
        showStatus("Please enter both email and password.", true);
        return;
    }

    setBusy(true);
    showStatus("Signing in…");

    try {
        const data = await jsonFetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        // Persist “who’s logged in” for the dashboard
        localStorage.setItem("authUser", JSON.stringify({
            userId: data.userId,
            email: data.email,
            displayName: data.displayName || data.email
        }));

        showStatus(`Welcome, ${data.displayName || data.email}!`, false);
        // Navigate to dashboard
        window.location.href = "/dashboard.html";
    } catch (err) {
        showStatus(`Login failed: ${err.message}`, true);
    } finally {
        setBusy(false);
    }
});

// Helpers for UI state
function showStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (isError ? " error" : " success");
}

function setBusy(busy) {
    if (submitBtn) submitBtn.disabled = !!busy;
    form.querySelectorAll("input").forEach(i => i.disabled = !!busy);
}
