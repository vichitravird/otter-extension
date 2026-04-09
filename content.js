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
    }
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

  function createOtterButton() {
    if (otterButton) {
      return otterButton;
    }

    otterButton = document.createElement("button");
    otterButton.id = "otter-floating-toggle";
    otterButton.type = "button";
    otterButton.textContent = "🦦 Otter";
    otterButton.setAttribute("aria-label", "Toggle Otter sidebar");

    otterButton.style.position = "fixed";
    otterButton.style.right = "16px";
    otterButton.style.top = "50%";
    otterButton.style.transform = "translateY(-50%)";
    otterButton.style.zIndex = "1000000";
    otterButton.style.border = "none";
    otterButton.style.borderRadius = "999px";
    otterButton.style.padding = "10px 14px";
    otterButton.style.fontSize = "16px";
    otterButton.style.fontWeight = "600";
    otterButton.style.cursor = "pointer";
    otterButton.style.background =
      "linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%)";
    otterButton.style.color = "#ffffff";
    otterButton.style.boxShadow = "0 8px 20px rgba(255, 107, 107, 0.35)";

    otterButton.addEventListener("click", () => {
      toggleSidebar();
    });

    document.documentElement.appendChild(otterButton);
    return otterButton;
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
  createSidebarIframe();
  createOtterButton();

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
