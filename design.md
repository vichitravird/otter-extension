# Otter — Design Document

## File Structure
otter-extension/
├── manifest.json          # Extension config
├── content.js             # Reads active text box, injects sidebar
├── sidebar.html           # Floating sidebar UI
├── sidebar.js             # Sidebar logic + Gemini API calls
├── sidebar.css            # Sidebar styles
├── config.js              # API key (gitignored)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── design.md
└── requirements.md

## User Flow
1. User is typing in any text box on any website
2. User clicks the Otter extension icon → sidebar slides in from right
3. Sidebar reads the current text box content automatically
4. User clicks "Generate Draft" → Gemini API returns polished draft
5. User optionally clicks Tone or Length buttons to refine
6. User clicks "Replace" to swap original text or "Copy" to clipboard

## Sidebar Layout (top to bottom)
- Otter logo + name header
- "Reading from: [site name]" label
- Original text preview (read-only, truncated)
- "Generate Draft" button
- Draft output area
- Tone buttons: Formal | Friendly | Assertive | Empathetic
- Length buttons: Shorten | Expand | Bullets | Summarize
- Copy button + Replace button