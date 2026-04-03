# optimize_gpt_chat

A Chrome extension focused on one annoying ChatGPT web problem: long conversations eventually become laggy, scroll poorly, and make the page feel heavy even when you want to stay in the same chat.

## Why this exists

Starting a fresh chat is not always a good workaround. Sometimes you want to keep the same thread, the same context, and the same working flow. This extension targets the frontend performance side of the problem by reducing how much of the conversation the browser has to keep actively rendering.

## What it does

- keeps only the most recent conversation turns rendered in the live DOM
- hides older turns behind a lightweight inline control bar
- lets you reveal older turns in batches when needed
- optionally applies offscreen rendering containment
- optionally simplifies action-bar visual overhead

The chat itself stays the same. This extension only changes what the browser actively renders.

## Key behavior

- does not start a new chat
- does not delete your ChatGPT history
- does not alter model output
- does not summarize or replace older turns
- keeps you in the same conversation thread

## Popup controls

The extension popup lets you adjust:

- enable / disable optimization
- how many recent turns stay rendered
- how many older turns to reveal per batch
- offscreen rendering containment
- action-bar simplification

## How it works

This is a frontend optimization layer for ChatGPT web. The extension watches the active thread and:

1. identifies individual conversation turns
2. keeps the latest window of turns mounted
3. removes older turns from the live DOM to cut rendering cost
4. inserts a lightweight banner so older turns can still be restored on demand

This approach helps when the bottleneck is browser rendering and DOM size, not just model latency.

## Project structure

```text
optimize_gpt_chat/
├── manifest.json
├── content.js
├── content.css
├── settings.js
├── popup.html
├── popup.css
└── popup.js
```

## Installation

### Option 1: Load unpacked

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the `optimize_gpt_chat` folder

### Option 2: Use a packaged zip

If you already have a packaged release, extract it and load the unpacked folder in Chrome.

## Supported URLs

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

## Current version

`0.1.0`

## Important limitation

This extension improves frontend responsiveness. It cannot eliminate all slowdown caused by extremely large model context on the server side, but it can make the web app itself feel much lighter during long chats.

## Roadmap

- safer dual mode: hide vs remove
- smarter behavior when reading old messages
- optional automatic restore when scrolling upward
- session stats in the popup
