# Peedy

A playable browser companion inspired by the 1990s Persona research project. The companion uses **Peedy**, with the unchanged archival image from Microsoft Persona’s CHI ’95 demo, preserved by developer David Kurlander. This is a contemporary interpretation, not recovered Microsoft source, and is not affiliated with or endorsed by Microsoft.

## Run locally

Node.js 22 or newer. No package install or build step is required.

```sh
npm start
# http://127.0.0.1:4187
npm test
npm run check
```

`dist/` is the complete deployable static site, deliberately tracked in Git. Serve it from the root of an HTTPS domain; `localhost` also supports WebGPU. `server.mjs` is only a local static server, not a backend.

## Working features

- Original Peedy archival portrait, with its background and pixels preserved; snack, boop, and original synthesized music interactions.
- Clearly labeled Classic mode with authored responses, available immediately without a download.
- Optional **real browser-local AI**: WebLLM 0.2.85 and Llama 3.2 1B. Explicit activation downloads roughly 1 GB of model assets, cached by the browser. WebGPU-capable desktop Chrome/Edge and sufficient graphics memory are required. Actual size and speed depend on the model cache and device.
- Worker-based model loading and streamed replies; progress, cancellation, errors, and a stop-generation control.
- Explicit memory commands (`My name is Alex`, `Remember that I love space`), individual deletion, and forgetting all memories.
- Device-local chat history and preferences; conversation deletion is independent from saved facts. Existing chat can still contain a deleted fact until cleared.
- Optional browser speech synthesis and speech recognition. Dictation places text in the composer for review and does not auto-send. Browser speech recognition may use a vendor service.
- Responsive companion, research-history, and community views; keyboard controls and reduced-motion support.
- Progressive WebMCP tools `persona_get_status` and `persona_interact` in browsers that implement `document.modelContext`.

## AI limitations

The small local model can hallucinate. It has no live web access or tools and cannot read the desktop, files, wallets, calendars, or other apps. Classic replies are not model-generated and are labeled accordingly. Chat messages, name, facts, preferences, and interaction counts use localStorage on the current origin. Changing domain, clearing browser data, or using another device will not transfer them. Model artifacts are cached separately by WebLLM. Network access is needed for initial model/code downloads and Google Fonts; there is no server-side AI key.

## Community / token configuration

`$PEEDY` is only a working community identity. **No token, blockchain, contract address, launch date, market data, wallet transactions, or social account is configured.** The interface states this openly. Edit the community panel once verified details exist. Nothing here mints, sells, buys, or signs for a token.

## Files

- `dist/index.html`, `dist/style.css`: interface and responsive styling.
- `dist/app.js`: UI, local state, audio, WebMCP, AI-worker lifecycle.
- `dist/companion.js`: state validation, explicit memory, classic dialogue, AI instructions.
- `dist/ai-worker.js`: version-pinned WebLLM adapter.
- `dist/assets/peedy-original.jpg`: unchanged 260×260 CHI ’95 Peedy portrait. See `ASSET_CREDITS.md` for provenance.
- `tests/companion.test.mjs`: memory, state corruption, capability-boundary checks.
- `.openai/hosting.json`: Sites identity and static-directory configuration.

## Historical sources

- [Persona project, by its developer](https://kurlander.net/DJ/Projects/Peedy/resources)
- [Microsoft Agent announcement, 1997](https://news.microsoft.com/source/1997/09/08/microsoft-agent-released-to-the-web-for-free-download/)
- [Microsoft Agent discontinuation](https://support.microsoft.com/vi-vn/topic/microsoft-agent-enabled-programs-do-not-work-in-windows-7-7e536639-1b8c-eff8-4a80-af207909b28e)
- [WebLLM documentation](https://webllm.mlc.ai/docs/user/get_started.html)
- [Llama model](https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC)

WebLLM and model weights retain their respective licenses. No third-party model weights are included. The archival Peedy image is a Microsoft character asset; it is not original artwork created for this project. See `ASSET_CREDITS.md`.
