(() => {
  const API_BASE = "https://stravella-fastapi.onrender.com";

  /* ------------------------------
     Utilities
  ------------------------------ */

  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getConfig() {
    const defaults = {
      client_id: "unknown-client",
      pack_id: "default-pack",
      business_name: "Stravella Assistant",
      greeting_message:
        "Hi! I can help you check availability, book an appointment, reschedule, or cancel — right here in chat.",
      display_phone: "",
      service_area_text: "",
      system_error_message:
        "Sorry — I’m having trouble connecting right now. Please use the phone number on this page.",
      quick_actions: [
        { label: "Check availability", prefill: "Check availability" },
        { label: "Book appointment", prefill: "Book an appointment" },
        { label: "Reschedule", prefill: "Reschedule my appointment" },
        { label: "Cancel", prefill: "Cancel my appointment" }
      ]
    };

    return {
      ...defaults,
      ...(window.StravellaWidgetConfig || {})
    };
  }

  function getThreadId(cfg) {
    const key = `stravella_thread_id::${cfg.client_id}::${cfg.pack_id}`;
    try {
      let tid = localStorage.getItem(key);
      if (!tid) {
        tid = uuid();
        localStorage.setItem(key, tid);
      }
      return tid;
    } catch {
      return uuid();
    }
  }

  /* ------------------------------
     DOM Injection
  ------------------------------ */

  function ensureDOM() {
    if (document.getElementById("chat-button")) return;

    const root = document.createElement("div");
    root.id = "stravella-widget-root";
    root.innerHTML = `
      <div id="chat-button" aria-label="Open chat">Chat</div>

      <div id="chat-widget" style="display:none;">
        <div id="chat-header">
          <span id="chat-title"></span>
          <button id="chat-close">×</button>
        </div>

        <div id="chat-trust">
          <div id="chat-trust-phone"></div>
          <div id="chat-trust-area"></div>
        </div>

        <div id="quick-actions"></div>

        <div id="chat-body"></div>

        <div id="chat-input-area">
          <input id="chat-input" placeholder="Type your message..." />
          <button id="chat-send">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  /* ------------------------------
     Main Init
  ------------------------------ */

  function init() {
    ensureDOM();

    const cfg = getConfig();
    const threadId = getThreadId(cfg);

    const chatButton = document.getElementById("chat-button");
    const widget = document.getElementById("chat-widget");
    const closeBtn = document.getElementById("chat-close");
    const title = document.getElementById("chat-title");
    const trustPhone = document.getElementById("chat-trust-phone");
    const trustArea = document.getElementById("chat-trust-area");
    const quickActions = document.getElementById("quick-actions");
    const body = document.getElementById("chat-body");
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send");

    if (
      !chatButton ||
      !widget ||
      !closeBtn ||
      !body ||
      !input ||
      !sendBtn
    ) {
      console.error("Stravella widget failed to initialize");
      return;
    }

    chatButton.setAttribute("aria-label", "Open chat");
    title.textContent = cfg.business_name;

    trustPhone.textContent = cfg.display_phone || "";
    trustArea.textContent = cfg.service_area_text || "";

    const intentMenuItems = [
      { label: "Book an appointment", prefill: "Book an appointment" },
      { label: "Check availability", prefill: "Check availability" },
      { label: "Reschedule appointment", prefill: "Reschedule my appointment" },
      { label: "Cancel appointment", prefill: "Cancel my appointment" },
      { label: "What are your hours?", prefill: "What are your hours?" },
      { label: "Where are you located?", prefill: "Where are you located?" }
    ];
    let menuHidden = false;

    function hideMenu() {
      if (menuHidden || !quickActions) return;
      menuHidden = true;
      quickActions.style.display = "none";
    }

    function renderMenu() {
      if (!quickActions) return;
      quickActions.innerHTML = "";

      const prompt = document.createElement("div");
      prompt.className = "intent-menu-prompt";
      prompt.textContent = "How can I help today?";
      quickActions.appendChild(prompt);

      const list = document.createElement("ul");
      list.className = "intent-menu-list";
      intentMenuItems.forEach(item => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "intent-menu-item";
        btn.textContent = item.label;
        btn.onclick = () => {
          input.value = item.prefill;
          input.focus();
          hideMenu();
        };
        li.appendChild(btn);
        list.appendChild(li);
      });
      quickActions.appendChild(list);
      quickActions.style.display = menuHidden ? "none" : "block";
    }

    renderMenu();

    function addMessage(text, who) {
      const div = document.createElement("div");
      div.className = `message ${who}`;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    chatButton.addEventListener("click", () => {
      widget.style.display = "flex";
      chatButton.style.display = "none";
      input.focus();
    });

    closeBtn.addEventListener("click", () => {
      widget.style.display = "none";
      chatButton.style.display = "block";
    });

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      hideMenu();
      addMessage(text, "user");
      input.value = "";
      sendBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/os/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            thread_id: threadId,
            client_id: cfg.client_id,
            pack_id: cfg.pack_id,
            channel: "chat"
          })
        });

        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        addMessage(data.reply || "", "bot");
      } catch {
        addMessage(cfg.system_error_message, "bot");
      } finally {
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    });
    input.addEventListener("focus", () => {
      if (window.matchMedia && window.matchMedia("(max-width: 480px)").matches) {
        hideMenu();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
