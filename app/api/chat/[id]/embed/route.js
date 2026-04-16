import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
  const { id: chatbotId } = await params;

  if (!chatbotId) {
    return new Response("console.error('[Chatbot] Missing chatbot id');", {
      status: 400,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: {
        id: true,
        name: true,
        tagline: true,
        greetingMessage: true,
        avatar: true,
        color: true,
        suggestedMessages: true,
        messagesLimit: true,
        messageCount: true,
        isActive: true,
        sendMessageText: true,
        botLanguage: true,
      },
    });

    if (!chatbot || !chatbot.isActive) {
      return new Response(
        "console.error('[Chatbot] Chatbot not found or inactive');",
        {
          status: 404,
          headers: { "Content-Type": "application/javascript" },
        },
      );
    }

    const origin = request.nextUrl.origin;

    const script = `(function () {
  console.log("[v0] Chatbot embed script starting...");
  
  if (window.__CHATBOT_WIDGET_${chatbot.id.replace(/-/g, "_")}__) {
    console.log("[v0] Widget already initialized, skipping");
    return;
  }
  window.__CHATBOT_WIDGET_${chatbot.id.replace(/-/g, "_")}__ = true;

  /* ================== CONFIG FROM DATABASE ================== */
  const cfg = ${JSON.stringify(
    {
      id: chatbot.id,
      name: chatbot.name,
      tagline: chatbot.tagline,
      greetingMessage: chatbot.greetingMessage,
      avatar: chatbot.avatar,
      color: chatbot.color,
      suggestedMessages: chatbot.suggestedMessages,
      messagesLimit: chatbot.messagesLimit,
      messageCount: chatbot.messageCount,
      isActive: chatbot.isActive,
      sendMessageText: chatbot.sendMessageText || "Send",
      botLanguage: chatbot.botLanguage || "en",
    },
    null,
    2,
  )};

  console.log("[v0] Chatbot config loaded:", cfg);

  function initWidget() {
    console.log("[v0] Initializing widget...");
    
    const accentColor = cfg.color || "#2563eb";
    let open = false;
    let messages = [];
    let loading = false;
    let isLimitReached = false;
    let errorMessage = "";
    let prevLoading = false;
    let assistantMessageStartEl = null;

    /* ================== HELPER FUNCTIONS ================== */
    function isRTL(text) {
      if (!text) return false;
      var rtlRegex = /[\\u0591-\\u07FF\\uFB1D-\\uFDFD\\uFE70-\\uFEFC]/;
      return rtlRegex.test(text);
    }

    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function linkify(text) {
      if (!text) return "";
      var urlRegex = /(https?:\\/\\/[^\\s]+)/g;
      return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="gb-link">' + url + '</a>';
      });
    }

    function formatMessage(content) {
      var processed = linkify(content);
      processed = processed
        .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/\\n/g, '<br>');
      return processed;
    }

    function saveMessages() {
      try {
        localStorage.setItem('chat_' + cfg.id, JSON.stringify(messages));
      } catch (e) {
        console.error('[Chatbot] Failed to save messages', e);
      }
    }

    function loadMessages() {
      try {
        var saved = localStorage.getItem('chat_' + cfg.id);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('[Chatbot] Failed to load messages', e);
      }
      return [{
        id: Date.now(),
        role: 'assistant',
        content: cfg.greetingMessage || 'Hello! How can I help you today?',
        createdAt: new Date().toISOString()
      }];
    }

    function checkLimit() {
      var limit = cfg.messagesLimit || 20;
      var count = cfg.messageCount || 0;
      isLimitReached = count >= limit;
    }

    /* ================== STYLES - MATCHING FLOATING WIDGET 100% ================== */
    var style = document.createElement("style");
    style.textContent = \`
      .gb-bubble {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        width: 60px !important;
        height: 60px !important;
        border-radius: 50%;
        background: \${accentColor};
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 999999;
        font-size: 26px;
        box-shadow: 0 10px 25px rgba(0,0,0,.3);
        transition: transform 0.2s, box-shadow 0.2s;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .gb-bubble:hover {
        transform: scale(1.05);
        box-shadow: 0 15px 35px rgba(0,0,0,.4);
      }

      .gb-bubble:active {
        transform: scale(0.95);
      }

      .gb-window {
        position: fixed;
        bottom: 90px;
        right: 24px;
        width: 400px;
        height: 750px;
        max-height: 85vh;
        background: #0f172a;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,.35);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 999999;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideInUp 0.3s ease-out;
      }

      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 768px) {
        .gb-window {
          width: 90vw;
          right: 5vw;
        }
      }

      .gb-window.gb-open {
        display: flex;
      }

      .gb-header {
        padding: 16px;
        background: \${accentColor};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0,0,0,.1);
        z-index: 10;
      }

      .gb-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        overflow: hidden;
        flex: 1;
      }

      .gb-avatar-wrap {
        position: relative;
        flex-shrink: 0;
      }

      .gb-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(255,255,255,0.3);
        background: white;
      }

      .gb-avatar-placeholder {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.3);
      }

      .gb-status-indicator {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        background: #10b981;
        border: 2px solid white;
        border-radius: 50%;
      }

      .gb-header-info {
        overflow: hidden;
        flex: 1;
      }

      .gb-header-name {
        font-weight: 700;
        font-size: 14px;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .gb-header-tagline {
        font-size: 11px;
        opacity: 0.9;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .gb-header-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .gb-header-btn {
        padding: 8px;
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gb-header-btn:hover {
        background: rgba(255,255,255,0.2);
      }

      .gb-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #1e293b;
        scroll-behavior: smooth;
      }

      .gb-msg-wrap {
        display: flex;
        margin: 24px 0;
        animation: fadeInUp 0.3s ease-out;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .gb-msg-user {
        justify-content: flex-end;
      }

      .gb-msg-bot {
        justify-content: flex-start;
      }

      .gb-msg-content {
        display: flex;
        max-width: 85%;
        gap: 8px;
      }

      .gb-msg-user .gb-msg-content {
        flex-direction: row-reverse;
      }

      .gb-msg-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        margin-top: auto;
        border: 1px solid rgba(0,0,0,0.1);
        background: white;
      }

      .gb-msg-avatar-placeholder {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        flex-shrink: 0;
        margin-top: auto;
        background: \${accentColor};
        color: white;
      }

      .gb-bubble-msg {
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 15px;
        line-height: 1.5;
        word-wrap: break-word;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }

      .gb-bubble-user {
        background: \${accentColor};
        color: white;
        border-bottom-right-radius: 4px;
      }

      .gb-bubble-bot {
        background: #0b1733;
        color: #e5e7eb;
        border: 1px solid #334155;
        border-bottom-left-radius: 4px;
      }

      .gb-msg-time {
        font-size: 9px;
        margin-top: 4px;
        display: block;
        opacity: 0.7;
      }

      .gb-msg-user .gb-msg-time {
        text-align: right;
        color: rgba(255,255,255,0.7);
      }

      .gb-msg-bot .gb-msg-time {
        text-align: right;
        color: #94a3b8;
      }

      .gb-link {
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
        word-break: break-all;
        font-weight: 600;
        color: #60a5fa;
      }

      .gb-link:hover {
        opacity: 0.8;
      }

      .gb-sources {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
      }

      .gb-sources-title {
        font-size: 10px;
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .gb-source-link {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 500;
        color: \${accentColor};
        text-decoration: none;
        margin-top: 6px;
      }

      .gb-source-link:hover {
        text-decoration: underline;
      }

      .gb-source-icon {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
      }

      .gb-loading {
        display: flex;
        gap: 4px;
        align-items: center;
        padding: 12px 16px;
      }

      .gb-loading-dot {
        width: 6px;
        height: 6px;
        background: #9ca3af;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
      }

      .gb-loading-dot:nth-child(1) {
        animation-delay: -0.32s;
      }

      .gb-loading-dot:nth-child(2) {
        animation-delay: -0.16s;
      }

      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }

      .gb-error {
        display: flex;
        justify-content: center;
        margin: 8px 0;
      }

      .gb-error-badge {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .gb-suggestions {
        margin-top: 12px;
        padding: 0 4px;
        animation: fadeInUp 0.3s ease-out;
      }

      .gb-suggestions-header {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 8px;
        padding: 0 4px;
      }

      .gb-suggestions-icon {
        width: 12px;
        height: 12px;
      }

      .gb-suggestions-list {
        display: flex;
        overflow-x: auto;
        gap: 8px;
        padding: 4px;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .gb-suggestions-list::-webkit-scrollbar {
        display: none;
      }

      .gb-suggestion-btn {
        flex-shrink: 0;
        white-space: nowrap;
        padding: 8px 16px;
        border-radius: 999px;
        border: 1px solid transparent;
        background: #1d4ed8;
        color: #c7d2fe;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .gb-suggestion-btn:hover {
        background: #1e40af;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .gb-suggestion-btn:active {
        transform: scale(0.95);
      }

      .gb-input-area {
        background: #0f172a;
        border-top: 1px solid #334155;
        padding: 12px;
      }

      .gb-input-wrap {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .gb-input {
        flex: 1;
        max-height: 128px;
        min-height: 44px;
        padding: 12px 16px;
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid transparent;
        border-radius: 16px;
        font-size: 14px;
        font-family: inherit;
        resize: none;
        transition: all 0.2s;
        outline: none;
      }

      .gb-input:focus {
        border-color: \${accentColor};
        background: #0f172a;
      }

      .gb-input::placeholder {
        color: #94a3b8;
      }

      .gb-send-btn {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        border-radius: 50%;
        border: none;
        background: \${accentColor};
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .gb-send-btn:not(:disabled):hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }

      .gb-send-btn:not(:disabled):active {
        transform: scale(0.95);
      }

      .gb-send-btn:disabled {
        background: #475569;
        cursor: not-allowed;
      }

      .gb-send-icon {
        width: 20px;
        height: 20px;
        margin-left: 2px;
      }

      .gb-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .gb-limit-reached {
        padding: 24px;
        background: #0b1733;
        border-radius: 12px;
        border: 1px solid #334155;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        animation: fadeInUp 0.3s ease-out;
      }

      .gb-limit-icon-wrap {
        width: 48px;
        height: 48px;
        background: #1e293b;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
      }

      .gb-limit-icon {
        width: 24px;
        height: 24px;
        color: #94a3b8;
      }

      .gb-limit-title {
        font-size: 16px;
        font-weight: 700;
        color: #f8fafc;
        margin-bottom: 4px;
      }

      .gb-limit-text {
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 16px;
      }

      .gb-upgrade-btn {
        width: 100%;
        padding: 12px 16px;
        background: \${accentColor};
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .gb-upgrade-btn:hover {
        opacity: 0.9;
      }
    \`;
    document.head.appendChild(style);

    /* ================== CREATE ELEMENTS ================== */
 var bubble = document.createElement("div");
bubble.className = "gb-bubble";

if (cfg.avatar && (cfg.avatar.startsWith("http") || cfg.avatar.startsWith("data:image"))) {
  var bubbleAvatar = document.createElement("img");
  bubbleAvatar.src = cfg.avatar;
  bubbleAvatar.alt = cfg.name || "Chatbot";
  bubbleAvatar.style.width = "100%";
  bubbleAvatar.style.height = "100%";
  bubbleAvatar.style.borderRadius = "50%";
  bubbleAvatar.style.objectFit = "cover";
  bubbleAvatar.style.border = "2px solid rgba(255,255,255,0.4)";
  
  bubble.style.background = "transparent"; // 🔥 THIS WAS MISSING
  bubble.appendChild(bubbleAvatar);
}
else {
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;">' +
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
    '</svg>';
}

    var win = document.createElement("div");
    win.className = "gb-window";

    var header = document.createElement("div");
    header.className = "gb-header";

    var headerLeft = document.createElement("div");
    headerLeft.className = "gb-header-left";

    var avatarWrap = document.createElement("div");
    avatarWrap.className = "gb-avatar-wrap";

    var avatar;
    if (cfg.avatar && (cfg.avatar.startsWith('data:image') || cfg.avatar.startsWith('http'))) {
      avatar = document.createElement("img");
      avatar.className = "gb-avatar";
      avatar.src = cfg.avatar;
      avatar.alt = cfg.name;
    } else {
      avatar = document.createElement("div");
      avatar.className = "gb-avatar-placeholder";
      avatar.textContent = (cfg.name || 'A').charAt(0).toUpperCase();
    }

    var statusIndicator = document.createElement("span");
    statusIndicator.className = "gb-status-indicator";

    avatarWrap.appendChild(avatar);
    avatarWrap.appendChild(statusIndicator);

    var headerInfo = document.createElement("div");
    headerInfo.className = "gb-header-info";

    var headerName = document.createElement("div");
    headerName.className = "gb-header-name";
    headerName.textContent = cfg.name || "AI Assistant";

    var headerTagline = document.createElement("div");
    headerTagline.className = "gb-header-tagline";
    headerTagline.textContent = cfg.tagline || "Online";

    headerInfo.appendChild(headerName);
    headerInfo.appendChild(headerTagline);

    var headerActions = document.createElement("div");
    headerActions.className = "gb-header-actions";

    var refreshBtn = document.createElement("button");
    refreshBtn.className = "gb-header-btn";
    refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>';
    refreshBtn.title = "New Chat";

    var closeBtn = document.createElement("button");
    closeBtn.className = "gb-header-btn";
    closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 20-4-9-9-4 20-7z"/></svg>';
    closeBtn.title = "Close";

    headerActions.appendChild(refreshBtn);
    headerActions.appendChild(closeBtn);

    headerLeft.appendChild(avatarWrap);
    headerLeft.appendChild(headerInfo);

    header.appendChild(headerLeft);
    header.appendChild(headerActions);

    var messagesDiv = document.createElement("div");
    messagesDiv.className = "gb-messages";

    var inputArea = document.createElement("div");
    inputArea.className = "gb-input-area";

    var inputWrap = document.createElement("div");
    inputWrap.className = "gb-input-wrap";

    var input = document.createElement("textarea");
    input.className = "gb-input";
    input.placeholder = "Type a message...";
    input.rows = 1;

    var sendBtn = document.createElement("button");
    sendBtn.className = "gb-send-btn";
    sendBtn.innerHTML = '<svg class="gb-send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);
    inputArea.appendChild(inputWrap);

    win.appendChild(header);
    win.appendChild(messagesDiv);
    win.appendChild(inputArea);

    document.body.appendChild(bubble);
    document.body.appendChild(win);
    
    console.log("[v0] Widget elements appended to body");
    console.log("[v0] Bubble element:", bubble);
    console.log("[v0] Bubble styles:", window.getComputedStyle(bubble));

    /* ================== FUNCTIONS ================== */
    function renderMessages() {
      messagesDiv.innerHTML = '';
      assistantMessageStartEl = null;
      var lastAssistantIndex = -1;

      for (var i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          lastAssistantIndex = i;
          break;
        }
      }

      messages.forEach(function(msg, idx) {
        var isUser = msg.role === 'user';
        var isMsgRtl = isRTL(msg.content);
        var shouldPinAssistantStart = !isUser && idx === lastAssistantIndex;

        var msgWrap = document.createElement('div');
        msgWrap.className = 'gb-msg-wrap ' + (isUser ? 'gb-msg-user' : 'gb-msg-bot');
        if (shouldPinAssistantStart) {
          assistantMessageStartEl = msgWrap;
        }

        var msgContent = document.createElement('div');
        msgContent.className = 'gb-msg-content';

        if (!isUser) {
          var msgAvatar;
          if (cfg.avatar && (cfg.avatar.startsWith('data:image') || cfg.avatar.startsWith('http'))) {
            msgAvatar = document.createElement('img');
            msgAvatar.className = 'gb-msg-avatar';
            msgAvatar.src = cfg.avatar;
            msgAvatar.alt = cfg.name;
          } else {
            msgAvatar = document.createElement('div');
            msgAvatar.className = 'gb-msg-avatar-placeholder';
            msgAvatar.textContent = (cfg.name || 'A').charAt(0).toUpperCase();
          }
          msgContent.appendChild(msgAvatar);
        }

        var bubbleMsg = document.createElement('div');
        bubbleMsg.className = 'gb-bubble-msg ' + (isUser ? 'gb-bubble-user' : 'gb-bubble-bot');
        if (isMsgRtl) bubbleMsg.dir = 'rtl';

        bubbleMsg.innerHTML = formatMessage(msg.content);

        var timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        var timeSpan = document.createElement('span');
        timeSpan.className = 'gb-msg-time';
        timeSpan.textContent = timeStr;
        bubbleMsg.appendChild(timeSpan);

        if (!isUser && msg.sources && msg.sources.length > 0) {
          var sourcesDiv = document.createElement('div');
          sourcesDiv.className = 'gb-sources';

          var sourcesTitle = document.createElement('div');
          sourcesTitle.className = 'gb-sources-title';
          sourcesTitle.textContent = 'Sources:';
          sourcesDiv.appendChild(sourcesTitle);

          msg.sources.forEach(function(source) {
            var sourceLink = document.createElement('a');
            sourceLink.className = 'gb-source-link';
            sourceLink.href = source.url;
            sourceLink.target = '_blank';
            sourceLink.rel = 'noopener noreferrer';
            sourceLink.innerHTML = '<svg class="gb-source-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg><span>' + escapeHtml(source.title) + '</span>';
            sourcesDiv.appendChild(sourceLink);
          });

          bubbleMsg.appendChild(sourcesDiv);
        }

        msgContent.appendChild(bubbleMsg);
        msgWrap.appendChild(msgContent);
        messagesDiv.appendChild(msgWrap);
      });

      if (loading) {
        var loadingWrap = document.createElement('div');
        loadingWrap.className = 'gb-msg-wrap gb-msg-bot';

        var loadingContent = document.createElement('div');
        loadingContent.className = 'gb-msg-content';

        var loadingAvatar;
        if (cfg.avatar && (cfg.avatar.startsWith('data:image') || cfg.avatar.startsWith('http'))) {
          loadingAvatar = document.createElement('img');
          loadingAvatar.className = 'gb-msg-avatar';
          loadingAvatar.src = cfg.avatar;
          loadingAvatar.alt = cfg.name;
        } else {
          loadingAvatar = document.createElement('div');
          loadingAvatar.className = 'gb-msg-avatar-placeholder';
          loadingAvatar.textContent = (cfg.name || 'A').charAt(0).toUpperCase();
        }
        loadingContent.appendChild(loadingAvatar);

        var loadingBubble = document.createElement('div');
        loadingBubble.className = 'gb-bubble-msg gb-bubble-bot gb-loading';
        loadingBubble.innerHTML = '<span class="gb-loading-dot"></span><span class="gb-loading-dot"></span><span class="gb-loading-dot"></span>';

        loadingContent.appendChild(loadingBubble);
        loadingWrap.appendChild(loadingContent);
        messagesDiv.appendChild(loadingWrap);
      }

      var showSuggestions = cfg.suggestedMessages && 
                            !loading && 
                            messages.length > 0 && 
                            messages[messages.length - 1].role === 'assistant' &&
                            !isLimitReached;

      if (showSuggestions) {
        var suggestions = cfg.suggestedMessages.split('\\n').filter(function(s) { return s.trim(); });
        if (suggestions.length > 0) {
          var suggestionsDiv = document.createElement('div');
          suggestionsDiv.className = 'gb-suggestions';

          var suggestionsHeader = document.createElement('div');
          suggestionsHeader.className = 'gb-suggestions-header';
          suggestionsHeader.innerHTML = '<svg class="gb-suggestions-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Suggested:</span>';
          suggestionsDiv.appendChild(suggestionsHeader);

          var suggestionsList = document.createElement('div');
          suggestionsList.className = 'gb-suggestions-list';

          suggestions.forEach(function(s) {
            var btn = document.createElement('button');
            btn.className = 'gb-suggestion-btn';
            btn.textContent = s;
            btn.onclick = function() {
              handleSendMessage(s);
            };
            suggestionsList.appendChild(btn);
          });

          suggestionsDiv.appendChild(suggestionsList);
          messagesDiv.appendChild(suggestionsDiv);
        }
      }

      if (errorMessage) {
        var errorWrap = document.createElement('div');
        errorWrap.className = 'gb-error';
        var errorBadge = document.createElement('span');
        errorBadge.className = 'gb-error-badge';
        errorBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> ' + escapeHtml(errorMessage);
        errorWrap.appendChild(errorBadge);
        messagesDiv.appendChild(errorWrap);
      }

      if (loading) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      } else if (prevLoading && assistantMessageStartEl) {
        assistantMessageStartEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
      prevLoading = loading;
    }

    function handleSendMessage(textOverride) {
      var textToSend = textOverride || input.value;
      if (!textToSend.trim() || loading || isLimitReached) return;

      var userMessage = {
        id: Date.now(),
        role: 'user',
        content: textToSend,
        createdAt: new Date().toISOString()
      };

      messages.push(userMessage);
      if (!textOverride) input.value = '';
      input.style.height = 'auto';
      loading = true;
      errorMessage = '';
      sendBtn.disabled = true;

      saveMessages();
      renderMessages();

      fetch(${JSON.stringify(origin + "/api/chat/public")}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          chatbotId: cfg.id
        })
      })
      .then(function(response) {
        if (response.status === 403) {
          isLimitReached = true;
          errorMessage = 'Message limit reached.';
          renderInputArea();
          loading = false;
          renderMessages();
          return null;
        }
        if (!response.ok) {
          return response.json().catch(function() { return {}; }).then(function(errorData) {
            throw new Error(errorData.error || 'Failed to send message');
          });
        }
        return response.json();
      })
      .then(function(data) {
        if (!data) return;

        var assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message || 'Unable to generate response.',
          sources: data.sources,
          createdAt: new Date().toISOString()
        };

        messages.push(assistantMessage);
        loading = false;
        errorMessage = '';
        saveMessages();
        renderMessages();
      })
      .catch(function(err) {
        console.error('[Chatbot] Error:', err);
        errorMessage = err && err.message ? err.message : 'Failed to send message';
        loading = false;
        renderMessages();
      });
    }

    function handleClearChat() {
      if (confirm('Start a new conversation?')) {
        messages = [{
          id: Date.now(),
          role: 'assistant',
          content: cfg.greetingMessage || 'Hello! How can I help you today?',
          createdAt: new Date().toISOString()
        }];
        errorMessage = '';
        localStorage.removeItem('chat_' + cfg.id);
        renderMessages();
      }
    }

    function renderInputArea() {
      inputArea.innerHTML = '';

      if (isLimitReached) {
        var limitDiv = document.createElement('div');
        limitDiv.className = 'gb-limit-reached';

        limitDiv.innerHTML = \`
          <div class="gb-limit-icon-wrap">
            <svg class="gb-limit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="gb-limit-title">You have reached your limit messages count</div>
          <div class="gb-limit-text">Upgrade to enjoy unlimited messages</div>
          <button class="gb-upgrade-btn">Upgrade Now</button>
        \`;

        inputArea.appendChild(limitDiv);
      } else {
        var newInputWrap = document.createElement('div');
        newInputWrap.className = 'gb-input-wrap';

        var newInput = document.createElement('textarea');
        newInput.className = 'gb-input';
        newInput.placeholder = 'Type a message...';
        newInput.rows = 1;

        var newSendBtn = document.createElement('button');
        newSendBtn.className = 'gb-send-btn';
        newSendBtn.innerHTML = '<svg class="gb-send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

        newInput.oninput = function() {
          newInput.style.height = 'auto';
          newInput.style.height = newInput.scrollHeight + 'px';
          newSendBtn.disabled = !newInput.value.trim() || loading;
        };

        newInput.onkeydown = function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        };

        newSendBtn.onclick = function() {
          handleSendMessage();
        };

        newSendBtn.disabled = !newInput.value.trim() || loading;

        newInputWrap.appendChild(newInput);
        newInputWrap.appendChild(newSendBtn);
        inputArea.appendChild(newInputWrap);

        input = newInput;
        sendBtn = newSendBtn;

        setTimeout(function() {
          input.focus();
        }, 100);
      }
    }

    /* ================== EVENT LISTENERS ================== */
    bubble.onclick = function() {
      open = !open;
      win.className = 'gb-window' + (open ? ' gb-open' : '');
      if (open && !isLimitReached) {
        setTimeout(function() {
          input.focus();
        }, 100);
      }
    };

    closeBtn.onclick = function() {
      open = false;
      win.className = 'gb-window';
    };

    refreshBtn.onclick = handleClearChat;

    input.oninput = function() {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
      sendBtn.disabled = !input.value.trim() || loading;
    };

    input.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    sendBtn.onclick = function() {
      handleSendMessage();
    };

    /* ================== INIT ================== */
    checkLimit();
    messages = loadMessages();
    prevLoading = false;
    renderMessages();
    renderInputArea();
    
    console.log("[v0] Widget initialization complete!");
  }

  if (document.readyState === "loading") {
    console.log("[v0] DOM not ready, waiting for DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    console.log("[v0] DOM already ready, initializing immediately");
    initWidget();
  }
})();`;

    return new Response(script, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("EMBED ERROR:", err);
    return new Response("console.error('[Chatbot] Server error');", {
      status: 500,
      headers: { "Content-Type": "application/javascript" },
    });
  }
}
