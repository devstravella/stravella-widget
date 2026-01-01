// Base URL for your live FastAPI chatbot
const API_BASE = "https://stravella-fastapi.onrender.com";

(function () {
  "use strict";

  function domReady(callback) {
    if (document.readyState === "interactive" || document.readyState === "complete") {
      callback();
      return;
    }

    const check = () => {
      if (document.readyState === "interactive" || document.readyState === "complete") {
        callback();
      } else {
        setTimeout(check, 30);
      }
    };

    check();
  }

  function stravellaGetEmbeddingScriptEl() {
    const cs = document.currentScript;
    if (cs) return cs;

    const scripts = Array.from(document.getElementsByTagName("script"));
    const match = scripts
      .slice()
      .reverse()
      .find((s) => (s.src || "").toLowerCase().includes("widget"));
    return match || null;
  }

  function stravellaReadConfigFromDataAttrs(scriptEl) {
    if (!scriptEl) return {};
    const d = scriptEl.dataset || {};
    return {
      client_id: d.clientId || "",
      pack_id: d.packId || "",
      business_name: d.businessName || "",
      greeting_message: d.greetingMessage || "",
      display_phone: d.displayPhone || "",
      service_area_text: d.serviceAreaText || "",
      system_error_message: d.systemErrorMessage || ""
    };
  }

  function stravellaNormalizeConfig(raw) {
    const defaults = {
      client_id: "unknown-client",
      pack_id: "default-pack",
      business_name: "Stravella",
      greeting_message:
        "Hi! I can help you check availability, book an appointment, reschedule, or cancel right here in chat.",
      display_phone: "",
      service_area_text: "",
      system_error_message:
        "Sorry, I'm having trouble connecting right now. Please use the phone number on this page to book.",
      quick_actions: [
        { id: "check_availability", label: "Check availability", prefill: "Check availability" },
        { id: "book", label: "Book appointment", prefill: "Book an appointment" },
        { id: "reschedule", label: "Reschedule", prefill: "Reschedule my appointment" },
        { id: "cancel", label: "Cancel", prefill: "Cancel my appointment" }
      ]
    };

    const cfg = { ...defaults, ...(raw || {}) };
    cfg.quick_actions = defaults.quick_actions;

    cfg.client_id = String(cfg.client_id || "").trim() || defaults.client_id;
    cfg.pack_id = String(cfg.pack_id || "").trim() || defaults.pack_id;
    cfg.business_name = String(cfg.business_name || "").trim() || defaults.business_name;
    cfg.greeting_message = String(cfg.greeting_message || "").trim() || defaults.greeting_message;
    cfg.display_phone = String(cfg.display_phone || "").trim();
    cfg.service_area_text = String(cfg.service_area_text || "").trim();
    cfg.system_error_message =
      String(cfg.system_error_message || "").trim() || defaults.system_error_message;

    return cfg;
  }

  function stravellaLoadWidgetConfig() {
    const scriptEl = stravellaGetEmbeddingScriptEl();

    const fromWindow =
      typeof window !== "undefined" && window.StravellaWidgetConfig
        ? window.StravellaWidgetConfig
        : null;

    const fromAttrs = stravellaReadConfigFromDataAttrs(scriptEl);

    const merged = { ...(fromAttrs || {}), ...(fromWindow || {}) };

    return stravellaNormalizeConfig(merged);
  }

  function stravellaUuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();

    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }

  function stravellaThreadStorageKey(cfg) {
    return `stravella_thread_id::${cfg.client_id}::${cfg.pack_id}`;
  }

  function stravellaGetOrCreateThreadId(cfg) {
    const key = stravellaThreadStorageKey(cfg);
    try {
      const existing = localStorage.getItem(key);
      if (existing && existing.trim()) return existing.trim();

      const tid = stravellaUuid();
      localStorage.setItem(key, tid);
      return tid;
    } catch (e) {
      return stravellaUuid();
    }
  }

  function ensureWidgetDOM() {
    let chatButton = document.getElementById("chat-button");
    if (!chatButton) {
      chatButton = document.createElement("button");
      chatButton.id = "chat-button";
      chatButton.type = "button";
      chatButton.setAttribute("aria-label", "Open chat");
      chatButton.textContent = "Chat";
      document.body.appendChild(chatButton);
    }

    let chatWidget = document.getElementById("chat-widget");
    if (!chatWidget) {
      chatWidget = document.createElement("div");
      chatWidget.id = "chat-widget";
      chatWidget.setAttribute("role", "dialog");
      chatWidget.setAttribute("aria-modal", "false");
      chatWidget.setAttribute("aria-label", "Chat widget");
      document.body.appendChild(chatWidget);
    }

    let header = document.getElementById("chat-header");
    if (!header) {
      header = document.createElement("div");
      header.id = "chat-header";
      chatWidget.appendChild(header);
    }

    let headerTitle = document.getElementById("chat-header-title");
    if (!headerTitle) {
      headerTitle = document.createElement("span");
      headerTitle.id = "chat-header-title";
      header.appendChild(headerTitle);
    }

    let closeBtn = document.getElementById("close-widget");
    if (!closeBtn) {
      closeBtn = document.createElement("button");
      closeBtn.id = "close-widget";
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Close chat");
      closeBtn.textContent = "X";
      header.appendChild(closeBtn);
    }

    let trustBlock = document.getElementById("chat-trust");
    if (!trustBlock) {
      trustBlock = document.createElement("div");
      trustBlock.id = "chat-trust";
      chatWidget.appendChild(trustBlock);
    }

    let trustPhone = document.getElementById("chat-trust-phone");
    if (!trustPhone) {
      trustPhone = document.createElement("div");
      trustPhone.id = "chat-trust-phone";
      trustBlock.appendChild(trustPhone);
    }

    let trustArea = document.getElementById("chat-trust-area");
    if (!trustArea) {
      trustArea = document.createElement("div");
      trustArea.id = "chat-trust-area";
      trustBlock.appendChild(trustArea);
    }

    let quickActions = document.getElementById("quick-actions");
    if (!quickActions) {
      quickActions = document.createElement("div");
      quickActions.id = "quick-actions";
      chatWidget.appendChild(quickActions);
    }

    let chatBody = document.getElementById("chat-body");
    if (!chatBody) {
      chatBody = document.createElement("div");
      chatBody.id = "chat-body";
      chatWidget.appendChild(chatBody);
    }

    let inputArea = document.getElementById("chat-input-area");
    if (!inputArea) {
      inputArea = document.createElement("div");
      inputArea.id = "chat-input-area";
      chatWidget.appendChild(inputArea);
    }

    let chatInput = document.getElementById("chat-input");
    if (!chatInput) {
      chatInput = document.createElement("textarea");
      chatInput.id = "chat-input";
      chatInput.rows = 1;
      chatInput.setAttribute("placeholder", "Type your message...");
      inputArea.appendChild(chatInput);
    }

    let sendBtn = document.getElementById("send-btn");
    if (!sendBtn) {
      sendBtn = document.createElement("button");
      sendBtn.id = "send-btn";
      sendBtn.type = "button";
      sendBtn.textContent = "Send";
      inputArea.appendChild(sendBtn);
    }
  }

  function applyConfigToUI(cfg, els) {
    els.chatHeaderTitle.textContent = cfg.business_name;

    const hasPhone = Boolean(cfg.display_phone);
    const hasArea = Boolean(cfg.service_area_text);

    if (!hasPhone && !hasArea) {
      els.trustBlock.style.display = "none";
    } else {
      els.trustBlock.style.display = "block";
      els.trustPhone.textContent = cfg.display_phone || "";
      els.trustArea.textContent = cfg.service_area_text || "";
    }

    els.quickActions.innerHTML = "";
    cfg.quick_actions.forEach((a) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "stravella-quick-action-btn";
      btn.textContent = a.label;
      btn.addEventListener("click", () => {
        els.chatInput.value = a.prefill;
        els.chatInput.focus();
      });
      els.quickActions.appendChild(btn);
    });
  }

  function scrollChatToBottom(chatBody) {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addUserMessage(chatBody, text) {
    const bubble = document.createElement("div");
    bubble.classList.add("message", "user");
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    scrollChatToBottom(chatBody);
  }

  function addBotMessage(chatBody, text) {
    const bubble = document.createElement("div");
    bubble.classList.add("message", "bot");
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    scrollChatToBottom(chatBody);
  }

  async function sendMessageToBot(cfg, threadId, message) {
    const response = await fetch(`${API_BASE}/os/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        thread_id: threadId,
        client_id: cfg.client_id,
        pack_id: cfg.pack_id,
        channel: "chat"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data.reply;
  }

  function init() {
    const cfg = stravellaLoadWidgetConfig();
    const threadId = stravellaGetOrCreateThreadId(cfg);

    ensureWidgetDOM();

    const els = {
      chatButton: document.getElementById("chat-button"),
      chatWidget: document.getElementById("chat-widget"),
      closeWidgetBtn: document.getElementById("close-widget"),
      chatHeaderTitle: document.getElementById("chat-header-title"),
      trustBlock: document.getElementById("chat-trust"),
      trustPhone: document.getElementById("chat-trust-phone"),
      trustArea: document.getElementById("chat-trust-area"),
      quickActions: document.getElementById("quick-actions"),
      chatBody: document.getElementById("chat-body"),
      chatInput: document.getElementById("chat-input"),
      sendBtn: document.getElementById("send-btn")
    };

    if (!els.chatButton || !els.chatWidget || !els.closeWidgetBtn || !els.chatInput || !els.sendBtn) {
      return;
    }

    els.chatWidget.style.display = "none";
    els.chatButton.style.display = "flex";

    applyConfigToUI(cfg, els);

    let hasGreeted = false;

    els.chatButton.addEventListener("click", () => {
      els.chatWidget.style.display = "flex";
      els.chatButton.style.display = "none";
      els.chatInput.focus();

      if (!hasGreeted) {
        addBotMessage(els.chatBody, cfg.greeting_message);
        hasGreeted = true;
      }
    });

    els.closeWidgetBtn.addEventListener("click", () => {
      els.chatWidget.style.display = "none";
      els.chatButton.style.display = "flex";
    });

    async function handleSend() {
      const text = els.chatInput.value.trim();
      if (!text) return;

      addUserMessage(els.chatBody, text);
      els.chatInput.value = "";
      els.chatInput.focus();

      els.sendBtn.disabled = true;

      try {
        const reply = await sendMessageToBot(cfg, threadId, text);
        addBotMessage(
          els.chatBody,
          reply || "I am here and listening, but something went quiet. Try asking again."
        );
      } catch (err) {
        addBotMessage(els.chatBody, cfg.system_error_message);
      } finally {
        els.sendBtn.disabled = false;
      }
    }

    els.sendBtn.addEventListener("click", () => {
      handleSend();
    });

    els.chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    });
  }

  domReady(init);
})();