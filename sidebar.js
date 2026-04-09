const API_KEY = GEMINI_API_KEY;
const GEMINI_URL_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

const SYSTEM_PROMPT =
  "You are Otter, a friendly AI writing assistant. The user has typed a rough message. Your job is to rewrite it into a polished, clear, and natural final draft. Keep the same intent and meaning. Do not add unnecessary fluff.";

const FALLBACK_ERROR_TEXT =
  "Oops! Otter couldn't reach the AI. Check your API key or try again. 🦦";

const siteLabelEl = document.getElementById("siteLabel");
const inputPreviewEl = document.getElementById("inputPreview");
const refreshBtnEl = document.getElementById("refreshBtn");
const generateBtnEl = document.getElementById("generateBtn");
const draftOutputEl = document.getElementById("draftOutput");
const loadingSpinnerEl = document.getElementById("loadingSpinner");
const emptyStateEl = document.getElementById("emptyState");
const copyBtnEl = document.getElementById("copyBtn");
const replaceBtnEl = document.getElementById("replaceBtn");
const closeBtnEl = document.getElementById("closeBtn");

function setLoading(isLoading) {
  loadingSpinnerEl.style.display = isLoading ? "block" : "none";
}

function updateEmptyState() {
  const hasDraft = Boolean(draftOutputEl.value.trim());
  emptyStateEl.style.display = hasDraft ? "none" : "block";
}

function getSiteNameFromLocation() {
  try {
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      return new URL(window.location.ancestorOrigins[0]).hostname;
    }
  } catch (_error) {
    // noop
  }

  try {
    if (document.referrer) {
      return new URL(document.referrer).hostname;
    }
  } catch (_error) {
    // noop
  }

  return window.location.hostname || "this site";
}

function setSiteLabel() {
  const siteName = getSiteNameFromLocation();
  siteLabelEl.textContent = `Reading from: ${siteName}`;
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!tabs || tabs.length === 0 || typeof tabs[0].id !== "number") {
        reject(new Error("No active tab found."));
        return;
      }

      resolve(tabs[0]);
    });
  });
}

function sendMessageToContentScript(message) {
  return new Promise(async (resolve, reject) => {
    try {
      const tab = await getActiveTab();
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function refreshDetectedText() {
  try {
    const response = await sendMessageToContentScript("GET_TEXT");
    inputPreviewEl.value = (response && response.text) || "";
  } catch (_error) {
    inputPreviewEl.value = "";
  }
}

async function callGemini(prompt) {
  const response = await fetch(`${GEMINI_URL_BASE}${API_KEY}`, {
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
    draftOutputEl.value = "";
    updateEmptyState();
    return;
  }

  setLoading(true);
  try {
    const prompt = `${instruction}\n\nMessage:\n${baseText}`;
    const draft = await callGemini(prompt);
    draftOutputEl.value = draft.trim();
  } catch (_error) {
    draftOutputEl.value = FALLBACK_ERROR_TEXT;
  } finally {
    setLoading(false);
    updateEmptyState();
  }
}

async function generateDraft() {
  const sourceText = inputPreviewEl.value || "";
  await runDraftRewrite(SYSTEM_PROMPT, sourceText);
}

async function applyTone(tone) {
  const currentDraft = draftOutputEl.value || "";
  const instruction = `Rewrite this message in a ${tone} tone. Keep the same meaning.`;
  await runDraftRewrite(instruction, currentDraft);
}

async function applyLength(lengthMode) {
  const currentDraft = draftOutputEl.value || "";
  let instruction = "";

  if (lengthMode === "Shorten") {
    instruction = "Rewrite this message to be shorter.";
  } else if (lengthMode === "Expand") {
    instruction = "Rewrite this message to be longer.";
  } else if (lengthMode === "Bullets") {
    instruction = "Rewrite this message in bullet points.";
  } else {
    instruction = "Rewrite this message to be summarized.";
  }

  await runDraftRewrite(instruction, currentDraft);
}

async function copyDraft() {
  const draft = draftOutputEl.value || "";
  if (!draft.trim()) {
    return;
  }

  try {
    await navigator.clipboard.writeText(draft);
    copyBtnEl.textContent = "Copied! ✓";
    setTimeout(() => {
      copyBtnEl.textContent = "Copy";
    }, 1300);
  } catch (_error) {
    // Clipboard can fail on restricted pages.
  }
}

async function replaceInPage() {
  const draft = draftOutputEl.value || "";
  if (!draft.trim()) {
    return;
  }

  try {
    await sendMessageToContentScript({ type: "REPLACE_TEXT", text: draft });
  } catch (_error) {
    // Ignore replace failures to keep UI responsive.
  }
}

async function toggleSidebar() {
  try {
    await sendMessageToContentScript("TOGGLE_SIDEBAR");
  } catch (_error) {
    // Ignore close failure.
  }
}

function bindButtons() {
  refreshBtnEl.addEventListener("click", refreshDetectedText);
  generateBtnEl.addEventListener("click", generateDraft);
  copyBtnEl.addEventListener("click", copyDraft);
  replaceBtnEl.addEventListener("click", replaceInPage);
  closeBtnEl.addEventListener("click", toggleSidebar);

  document.querySelectorAll("[data-tone]").forEach((button) => {
    button.addEventListener("click", async () => {
      await applyTone(button.dataset.tone);
    });
  });

  document.querySelectorAll("[data-length]").forEach((button) => {
    button.addEventListener("click", async () => {
      await applyLength(button.dataset.length);
    });
  });
}

async function init() {
  setSiteLabel();
  updateEmptyState();
  bindButtons();
  await refreshDetectedText();
}

init();
