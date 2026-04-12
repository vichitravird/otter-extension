(() => {
  let activeElement = null;
  let sidebarIframe = null;
  let otterButton = null;

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
    hideOtterAnchor();
  }

  function createSidebarIframe() {
    if (sidebarIframe) {
      return sidebarIframe;
    }

    sidebarIframe = document.createElement("iframe");
    sidebarIframe.src = chrome.runtime.getURL("sidebar.html");
    sidebarIframe.id = "otter-sidebar-iframe";
    sidebarIframe.style.position = "fixed";
    sidebarIframe.style.top = "0";
    sidebarIframe.style.right = "0";
    sidebarIframe.style.width = "380px";
    sidebarIframe.style.height = "100vh";
    sidebarIframe.style.zIndex = "999999";
    sidebarIframe.style.border = "none";
    sidebarIframe.style.boxShadow = "0 0 24px rgba(0, 0, 0, 0.2)";
    sidebarIframe.style.background = "white";
    sidebarIframe.style.display = "none";

    document.documentElement.appendChild(sidebarIframe);
    return sidebarIframe;
  }

  function ensureOtterButton() {
    if (otterButton) {
      return otterButton;
    }

    otterButton = document.createElement("button");
    otterButton.id = "otter-inline-anchor";
    otterButton.type = "button";
    otterButton.textContent = "🦦";
    otterButton.setAttribute("aria-label", "Toggle Otter sidebar");

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
      "z-index:999999",
      "display:none",
    ].join(";");

    otterButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
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
    // getBoundingClientRect is viewport-relative; document corner is
    // (rect.right + scrollX, rect.bottom + scrollY). For a root-level
    // position:absolute control, left/top are viewport-based, so use
    // rect + 8px offset and recompute on window scroll/resize.
    const left = rect.right + 8;
    const top = rect.bottom + 8;

    otterButton.style.left = `${left}px`;
    otterButton.style.top = `${top}px`;
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
    if (otterButton) {
      otterButton.style.display = "none";
    }
  }

  function onDocumentPointerDown(event) {
    const target = event.target;
    if (otterButton && (target === otterButton || otterButton.contains(target))) {
      return;
    }
    if (isEditableElement(target)) {
      return;
    }
    hideOtterAnchor();
  }

  function onWindowScrollOrResize() {
    updateOtterAnchorPosition();
  }

  function toggleSidebar() {
    const sidebar = createSidebarIframe();
    const isHidden = sidebar.style.display === "none";
    sidebar.style.display = isHidden ? "block" : "none";
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

  createSidebarIframe();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message === "GET_TEXT") {
      sendResponse({ text: getActiveElementText() });
      return;
    }

    if (message && message.type === "REPLACE_TEXT") {
      const replaced = replaceActiveElementText(message.text);
      sendResponse({ success: replaced });
      return;
    }

    if (message === "TOGGLE_SIDEBAR") {
      toggleSidebar();
      sendResponse({ success: true });
    }
  });
})();
