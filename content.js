(() => {
  const GEMINI_URL_BASE =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

  const SYSTEM_PROMPT =
    "You are Otter, an AI writing assistant. Rewrite the user's message into ONE single polished version. STRICT RULES: Output the final message text ONLY. No introductions like 'Here is...' or 'Here's a...'. No options, no alternatives, no numbered lists. No asterisks (*), no markdown formatting of any kind. No explanations or closing remarks. Just the rewritten message. Nothing else.";

  const FALLBACK_ERROR_TEXT =
    "Oops! Otter couldn't reach the AI. Check your API key or try again. 🦦";

  let activeElement = null;
  let otterButton = null;
  let otterPopover = null;
  let draftTextarea = null;
  let loadingEl = null;
  let copyBtn = null;
  let popoverOpen = false;

  function getApiKey() {
    return typeof GEMINI_API_KEY !== "undefined" && GEMINI_API_KEY
      ? GEMINI_API_KEY
      : "";
  }

  function isEditableElement(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }

    const tag = element.tagName.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      element.isContentEditable === true
    );
  }

  function setActiveElementFromEvent(event) {
    const target = event?.target;
    if (isEditableElement(target)) {
      activeElement = target;
      showOtterAnchor();
      return;
    }
    if (
      otterButton &&
      target &&
      (target === otterButton || otterButton.contains(target))
    ) {
      return;
    }
    if (otterPopover && target && otterPopover.contains(target)) {
      return;
    }
    hideOtterAnchor();
  }

  function createOtterPopover() {
    if (otterPopover) {
      return otterPopover;
    }

    const root = document.createElement("div");
    root.id = "otter-popover";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Otter");
    root.style.cssText = [
      "display:none",
      "position:fixed",
      "box-sizing:border-box",
      "width:320px",
      "max-height:480px",
      "overflow-y:auto",
      "padding:14px",
      "border-radius:16px",
      "background:#FFFBF0",
      "border:1px solid #F59E0B",
      "box-shadow:0 8px 32px rgba(0,0,0,0.12)",
      "z-index:9999999",
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
      "color:#292524",
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";

    const brand = document.createElement("div");
    brand.style.cssText =
      "display:flex;align-items:center;gap:8px;font-size:16px;font-weight:600;";
    brand.appendChild(document.createTextNode("🦦 Otter"));

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText =
      "width:30px;height:30px;border:none;border-radius:999px;background:#FFF7ED;color:#92400E;cursor:pointer;font-size:14px;line-height:1;";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePopover();
    });

    header.appendChild(brand);
    header.appendChild(closeBtn);

    const divider = document.createElement("div");
    divider.style.cssText = "height:1px;background:#E7E5E4;margin:0 0 12px 0;";

    const generateBtn = document.createElement("button");
    generateBtn.type = "button";
    generateBtn.textContent = "✨ Generate Draft";
    generateBtn.style.cssText =
      "width:100%;border:none;border-radius:12px;padding:11px 12px;font-size:14px;font-weight:700;color:#fff;background:#F59E0B;cursor:pointer;margin-bottom:12px;";
    generateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      generateDraft();
    });

    const draftWrap = document.createElement("div");
    draftWrap.style.cssText = "position:relative;margin-bottom:12px;";

    draftTextarea = document.createElement("textarea");
    draftTextarea.readOnly = true;
    draftTextarea.setAttribute("aria-label", "Draft output");
    draftTextarea.placeholder = "Your draft will appear here...";
    draftTextarea.style.cssText = [
      "display:block",
      "width:100%",
      "box-sizing:border-box",
      "max-height:140px",
      "min-height:72px",
      "overflow-y:auto",
      "resize:none",
      "font-size:13px",
      "line-height:1.45",
      "padding:10px",
      "background:#fff",
      "border-radius:8px",
      "border:1px solid #E7E5E4",
      "color:#292524",
      "margin:0",
    ].join(";");

    loadingEl = document.createElement("div");
    loadingEl.textContent = "🦦 thinking...";
    loadingEl.style.cssText = [
      "display:none",
      "position:absolute",
      "left:10px",
      "right:10px",
      "top:50%",
      "transform:translateY(-50%)",
      "text-align:center",
      "font-size:13px",
      "color:#78716C",
      "pointer-events:none",
    ].join(";");

    draftWrap.appendChild(draftTextarea);
    draftWrap.appendChild(loadingEl);

    const pillBase =
      "font-size:12px;padding:4px 10px;border:1px solid #F59E0B;border-radius:20px;background:#fff;color:#F59E0B;cursor:pointer;font-weight:500;";

    function bindPillHover(b) {
      b.addEventListener("mouseenter", () => {
        b.style.background = "#F59E0B";
        b.style.color = "#fff";
      });
      b.addEventListener("mouseleave", () => {
        b.style.background = "#fff";
        b.style.color = "#F59E0B";
      });
    }

    function makePillRow(items, onClick) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;";
      items.forEach((item) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = item.label;
        b.style.cssText = pillBase;
        bindPillHover(b);
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          onClick(item.value);
        });
        row.appendChild(b);
      });
      return row;
    }

    const toneRow = makePillRow(
      [
        { label: "Formal", value: "Formal" },
        { label: "Friendly", value: "Friendly" },
        { label: "Assertive", value: "Assertive" },
        { label: "Empathetic", value: "Empathetic" },
      ],
      (tone) => {
        const instruction = `Rewrite this message in a ${tone} tone. Keep the same meaning.`;
        applyRefinement(instruction);
      }
    );

    const lengthRow = makePillRow(
      [
        { label: "Shorten", value: "shorten" },
        { label: "Expand", value: "expand" },
        { label: "Bullets", value: "bullets" },
        { label: "Summarize", value: "summarize" },
      ],
      (mode) => {
        let instruction = "";
        if (mode === "shorten") {
          instruction = "Rewrite this message to be shorter.";
        } else if (mode === "expand") {
          instruction = "Rewrite this message to be longer.";
        } else if (mode === "bullets") {
          instruction = "Rewrite this message in bullet points.";
        } else {
          instruction = "Rewrite this message to be summarized.";
        }
        applyRefinement(instruction);
      }
    );

    const actions = document.createElement("div");
    actions.style.cssText =
      "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;";

    copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";
    copyBtn.style.cssText =
      "border:1px solid #F59E0B;background:#fff;color:#B45309;border-radius:10px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;";
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyDraft();
    });

    const replaceBtn = document.createElement("button");
    replaceBtn.type = "button";
    replaceBtn.textContent = "Replace in page";
    replaceBtn.style.cssText =
      "border:none;background:#F59E0B;color:#fff;border-radius:10px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;";
    replaceBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      replaceInPage();
    });

    actions.appendChild(copyBtn);
    actions.appendChild(replaceBtn);

    root.appendChild(header);
    root.appendChild(divider);
    root.appendChild(generateBtn);
    root.appendChild(draftWrap);
    root.appendChild(toneRow);
    root.appendChild(lengthRow);
    root.appendChild(actions);

    (document.body || document.documentElement).appendChild(root);
    otterPopover = root;
    return root;
  }

  function layoutPopoverNearAnchor() {
    if (!otterPopover || !otterButton) {
      return;
    }

    const ar = otterButton.getBoundingClientRect();
    const ph = otterPopover.offsetHeight;
    const gap = 8;
    const w = 320;
    let left = ar.right - w;
    if (left < 8) {
      left = 8;
    }
    if (left + w > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - w - 8);
    }

    let top = ar.top - ph - gap;
    if (top < 8) {
      top = ar.bottom + gap;
      if (top + ph > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - ph - 8);
      }
    }

    otterPopover.style.width = `${w}px`;
    otterPopover.style.left = `${left}px`;
    otterPopover.style.top = `${top}px`;
  }

  function setLoading(isLoading) {
    if (!loadingEl || !draftTextarea) {
      return;
    }
    loadingEl.style.display = isLoading ? "block" : "none";
    draftTextarea.style.opacity = isLoading ? "0.35" : "1";
  }

  async function callGemini(prompt) {
    const key = getApiKey();
    if (!key) {
      throw new Error("Missing API key");
    }

    const response = await fetch(`${GEMINI_URL_BASE}${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    const result =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!result) {
      throw new Error("Gemini response did not contain draft text.");
    }

    return result;
  }

  async function runDraftRewrite(instruction, sourceText) {
    const baseText = (sourceText || "").trim();
    if (!baseText) {
      if (draftTextarea) {
        draftTextarea.value = "";
      }
      return;
    }

    setLoading(true);
    try {
      const prompt = `${instruction}\n\nMessage:\n${baseText}`;
      const draft = await callGemini(prompt);
      if (draftTextarea) {
        draftTextarea.value = draft.trim();
      }
    } catch (_error) {
      if (draftTextarea) {
        draftTextarea.value = FALLBACK_ERROR_TEXT;
      }
    } finally {
      setLoading(false);
    }
  }

  async function generateDraft() {
    const sourceText = getActiveElementText();
    await runDraftRewrite(SYSTEM_PROMPT, sourceText);
  }

  async function applyRefinement(instruction) {
    const currentDraft = (draftTextarea && draftTextarea.value) || "";
    await runDraftRewrite(instruction, currentDraft);
  }

  async function copyDraft() {
    const draft = (draftTextarea && draftTextarea.value) || "";
    if (!draft.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(draft);
      if (copyBtn) {
        copyBtn.textContent = "Copied ✓";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1500);
      }
    } catch (_error) {
      // Clipboard can fail on restricted pages.
    }
  }

  function replaceInPage() {
    const draft = (draftTextarea && draftTextarea.value) || "";
    if (!draft.trim()) {
      return;
    }
    replaceActiveElementText(draft);
  }

  function ensureOtterButton() {
    if (otterButton) {
      return otterButton;
    }

    otterButton = document.createElement("button");
    otterButton.id = "otter-inline-anchor";
    otterButton.type = "button";
    otterButton.textContent = "🦦";
    otterButton.setAttribute("aria-label", "Toggle Otter");

    otterButton.style.cssText = [
      "position:absolute",
      "box-sizing:border-box",
      "width:36px",
      "height:36px",
      "padding:0",
      "margin:0",
      "border:none",
      "border-radius:50%",
      "font-size:18px",
      "line-height:36px",
      "text-align:center",
      "cursor:pointer",
      "background:#F59E0B",
      "color:#ffffff",
      "box-shadow:0 2px 8px rgba(0,0,0,0.18)",
      "z-index:9999998",
      "display:none",
    ].join(";");

    otterButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePopover();
    });

    (document.body || document.documentElement).appendChild(otterButton);
    return otterButton;
  }

  function updateOtterAnchorPosition() {
    if (!otterButton || otterButton.style.display === "none") {
      return;
    }

    if (!activeElement || !isEditableElement(activeElement)) {
      return;
    }

    const rect = activeElement.getBoundingClientRect();
    const left = rect.right + 8;
    const top = rect.bottom + 8;

    otterButton.style.left = `${left}px`;
    otterButton.style.top = `${top}px`;
    if (popoverOpen) {
      requestAnimationFrame(() => layoutPopoverNearAnchor());
    }
  }

  function updatePopoverPosition() {
    if (
      !otterPopover ||
      !popoverOpen ||
      !otterButton ||
      otterButton.style.display === "none"
    ) {
      return;
    }
    layoutPopoverNearAnchor();
  }

  function openPopover() {
    createOtterPopover();
    otterPopover.style.display = "block";
    otterPopover.style.visibility = "hidden";
    otterPopover.style.left = "-9999px";
    otterPopover.style.top = "0";
    void otterPopover.offsetHeight;
    layoutPopoverNearAnchor();
    otterPopover.style.visibility = "visible";
    popoverOpen = true;
  }

  function closePopover() {
    if (otterPopover) {
      otterPopover.style.display = "none";
      otterPopover.style.visibility = "";
    }
    popoverOpen = false;
  }

  function togglePopover() {
    if (!otterButton || otterButton.style.display === "none") {
      return;
    }
    createOtterPopover();
    if (popoverOpen) {
      closePopover();
    } else {
      openPopover();
    }
  }

  function showOtterAnchor() {
    if (!activeElement || !isEditableElement(activeElement)) {
      return;
    }

    const btn = ensureOtterButton();
    btn.style.display = "block";
    updateOtterAnchorPosition();
  }

  function hideOtterAnchor() {
    closePopover();
    if (otterButton) {
      otterButton.style.display = "none";
    }
  }

  function onDocumentPointerDown(event) {
    const target = event.target;
    if (otterButton && (target === otterButton || otterButton.contains(target))) {
      return;
    }
    if (otterPopover && otterPopover.contains(target)) {
      return;
    }
    if (isEditableElement(target)) {
      if (popoverOpen) {
        closePopover();
      }
      return;
    }
    hideOtterAnchor();
  }

  function onWindowScrollOrResize() {
    updateOtterAnchorPosition();
    updatePopoverPosition();
  }

  function getActiveElementText() {
    if (!isEditableElement(activeElement)) {
      return "";
    }

    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      return activeElement.value || "";
    }

    return activeElement.innerText || "";
  }

  function replaceActiveElementText(text) {
    if (!isEditableElement(activeElement)) {
      return false;
    }

    const safeText = typeof text === "string" ? text : "";

    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement
    ) {
      activeElement.value = safeText;
      activeElement.dispatchEvent(new Event("input", { bubbles: true }));
      activeElement.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    activeElement.innerText = safeText;
    activeElement.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  document.addEventListener("focusin", setActiveElementFromEvent, true);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);

  window.addEventListener("scroll", onWindowScrollOrResize, { passive: true });
  window.addEventListener("resize", onWindowScrollOrResize);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === "TOGGLE_SIDEBAR") {
      togglePopover();
      sendResponse({ success: true });
      return;
    }

    if (message === "GET_TEXT") {
      sendResponse({ text: getActiveElementText() });
      return;
    }

    if (message && message.type === "REPLACE_TEXT") {
      const replaced = replaceActiveElementText(message.text);
      sendResponse({ success: replaced });
      return;
    }
  });
})();
