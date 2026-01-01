// Base URL for your live FastAPI chatbot
const API_BASE = "https://stravella-fastapi.onrender.com";

// Grab elements
const chatButton = document.getElementById("chat-button");
const chatWidget = document.getElementById("chat-widget");
const closeWidgetBtn = document.getElementById("close-widget");
const chatBody = document.getElementById("chat-body");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

// Show widget when button clicked
chatButton.addEventListener("click", () => {
    chatWidget.style.display = "flex";
    chatButton.style.display = "none";
    chatInput.focus();

    // Optional: send a warm greeting the first time
    if (!chatBody.dataset.hasGreeted) {
        addBotMessage(
            "Hi! I’m your Stravella assistant. I can help you check availability, book, reschedule, or cancel an appointment. What would you like to do?"
        );
        chatBody.dataset.hasGreeted = "true";
    }
});

// Hide widget and show button again
closeWidgetBtn.addEventListener("click", () => {
    chatWidget.style.display = "none";
    chatButton.style.display = "flex";
});

// Send message on button click
sendBtn.addEventListener("click", () => {
    handleSend();
});

// Send on Enter key
chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
    }
});

// Core send logic
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    addUserMessage(text);
    chatInput.value = "";
    chatInput.focus();

    // Disable send while waiting
    sendBtn.disabled = true;

    try {
        const reply = await sendMessageToBot(text);
        addBotMessage(
            reply ||
                "I’m here and listening, but something went a bit quiet. Try asking again?"
        );
    } catch (err) {
        console.error("Chat error:", err);
        addBotMessage(
            "Sorry, I had trouble reaching the Stravella server. Please try again in a moment."
        );
    } finally {
        sendBtn.disabled = false;
    }
}

// NEW: Call your FastAPI /os/chat endpoint (StravellaOS agent pipeline)
async function sendMessageToBot(message) {
    const response = await fetch(`${API_BASE}/os/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message,
            channel: "chat"
            // Later we can add a "booking" block here when needed
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    // StravellaOS agent replies look like: { reply: "...", agent: "...", data: {...} }
    return data.reply;
}

// Helpers to render messages
function addUserMessage(text) {
    const bubble = document.createElement("div");
    bubble.classList.add("message", "user");
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    scrollChatToBottom();
}

function addBotMessage(text) {
    const bubble = document.createElement("div");
    bubble.classList.add("message", "bot");
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    scrollChatToBottom();
}

function scrollChatToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
}
