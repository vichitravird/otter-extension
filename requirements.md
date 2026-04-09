# Otter — Requirements Document

## Problem Statement
Users waste time rewriting messages, emails, and notes to get the right tone and length.
Otter reads what you've typed and helps you finalize it instantly — right inside your browser.

## Target Users
Anyone who writes in a browser: professionals, students, remote workers.

## Scope (v1)
- Works on all websites
- Activates only on the text box the user is currently focused on
- Floating sidebar UI (slides in from the right side of the screen)

## Core Features
1. **Auto-read** — detects the active text box and reads its content
2. **AI Draft** — sends content to Gemini API and returns a polished draft
3. **Tone Setter** — one-click tone options: Formal, Friendly, Assertive, Empathetic
4. **Length Optimizer** — one-click: Shorten, Expand, Bullet Points, Summarize
5. **Copy / Replace** — user can copy the draft or replace the original text with it

## Out of Scope (v1)
- No login or user accounts
- No history of past drafts
- No support for file uploads or attachments

## API
- Provider: Google Gemini (gemini-1.5-flash)
- Key stored in: config.js (gitignored)

## Fun & Personality
- Otter branding throughout (name, icon, friendly microcopy)
- Sidebar feels light and interactive, not like a boring tool