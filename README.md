# Peedy

A working browser music companion inspired by the 1990s Persona research project. **Peedy** finds and plays music from your library, answers follow-up requests, and reacts with original Microsoft character animations. This is a contemporary implementation, not recovered Microsoft software, and is not affiliated with or endorsed by Microsoft.

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

- Real music playback, pause/resume, previous/next, seeking, volume, mute, shuffle, repeat, and automatic queue progression.
- Library-aware requests such as **“Play something classical”**, **“What do you have by Bach?” → “Play it”**, **“Something upbeat”**, **“Pause”**, and **“Volume 30”**. Peedy asks for clarification when needed and reports unavailable artists honestly. Common Russian/Ukrainian music commands are supported too. Music commands work immediately without AI.
- Four full starter recordings streamed from Wikimedia Commons, with performer and license credits: Beethoven, Bach, Scott Joplin, and Pachelbel. These are full recordings, not preview clips.
- Add your own audio files, search them by title/artist/genre/mood, and edit their details. Files remain on the current device in IndexedDB; they are never uploaded. Common MP3 ID3 tags are read locally, with filename fallback. The browser must support the audio codec. Limit: 100 files per selection, 150 MB per file.
- Original **Microsoft Agent-era** Peedy sprite animations for listening, thinking, speaking gestures, music, snack, and boop. A display toggle preserves access to the unchanged **Persona CHI ’95** archival portrait. These are distinct historical versions, not newly generated artwork. Speech gestures follow synthesis events; phoneme-level lip sync is not implemented.
- Clearly labeled Classic mode with authored responses, available immediately without a download.
- Optional **real browser-local AI**: WebLLM 0.2.85 and Llama 3.2 1B. Explicit activation downloads roughly 1 GB of model assets, cached by the browser. WebGPU-capable desktop Chrome/Edge and sufficient graphics memory are required. Actual size and speed depend on the model cache and device.
- Worker-based model loading and streamed replies; progress, cancellation, errors, and a stop-generation control.
- Explicit memory commands (`My name is Alex`, `Remember that I love space`), individual deletion, and forgetting all memories.
- Device-local chat history and preferences; conversation deletion is independent from saved facts. Existing chat can still contain a deleted fact until cleared.
- Optional browser speech synthesis and speech recognition. Clicking the microphone listens for a request and **sends its transcription automatically**; while a response is busy, it leaves the transcription in the composer. Music becomes quieter while Peedy speaks or listens. Microphone permission and browser support are required; browser speech recognition may use a vendor service.
- Responsive companion, research-history, and community views; keyboard controls and reduced-motion support.
- Progressive WebMCP tools `peedy_music_status` and `peedy_music_command`, plus the existing `persona_get_status` and `persona_interact` compatibility names, in browsers that implement `document.modelContext`.

## Scope and storage

Peedy searches the starter recordings and songs explicitly added to this browser. It cannot search or play the entire Spotify/Apple Music catalog, control desktop applications, or inspect other files. Starter streams need a network connection and may occasionally be unavailable. Playback may require pressing Play because of browser autoplay rules. Song files and edits persist on the current origin until browser storage is cleared or evicted; they do not sync across devices or domains. If saving fails, Peedy reports that the affected songs last only for the current visit.

Voice input is browser-dependent. Use a supported desktop Chrome/Edge browser and allow the microphone, or type the same commands. No microphone permission is requested until you press the mic. Media playback, file restoration, and follow-up commands have been tested in the browser; microphone capture requires testing with your own spoken input.

## AI limitations

The small local model can hallucinate. It has no live web access or tools and cannot read the desktop, files, wallets, calendars, or other apps. Classic replies are not model-generated and are labeled accordingly. Chat messages, name, facts, preferences, and interaction counts use localStorage on the current origin. Changing domain, clearing browser data, or using another device will not transfer them. Model artifacts are cached separately by WebLLM. Network access is needed for initial model/code downloads and Google Fonts; there is no server-side AI key.

## Community / token configuration

`$PEEDY` is only a working community identity. **No token, blockchain, contract address, launch date, market data, wallet transactions, or social account is configured.** The interface states this openly. Edit the community panel once verified details exist. Nothing here mints, sells, buys, or signs for a token.

## Files

- `dist/index.html`, `dist/style.css`: interface and responsive styling.
- `dist/app.js`: UI, local state, voice, WebMCP, AI-worker lifecycle.
- `dist/music-engine.js`: library search and contextual music-command dialogue.
- `dist/music-library.js`: starter catalog, local tag reading, IndexedDB storage.
- `dist/music-player.js`: actual playback, queue, library management, and file import.
- `dist/character.js`: original animation frame composition and gesture state.
- `dist/companion.js`: state validation, explicit memory, classic dialogue, AI instructions.
- `dist/ai-worker.js`: version-pinned WebLLM adapter.
- `dist/assets/peedy-original.jpg`: unchanged 260×260 CHI ’95 Peedy portrait. See `ASSET_CREDITS.md` for provenance.
- `dist/assets/peedy-agent/`: original sprite sheet and animation metadata, with source credits in `ASSET_CREDITS.md`.
- `tests/`: memory, state corruption, music requests, clarification, negation, controls, metadata fallback, and capability-boundary checks.
- `.openai/hosting.json`: Sites identity and static-directory configuration.

## Historical sources

- [Persona project, by its developer](https://kurlander.net/DJ/Projects/Peedy/resources)
- [Microsoft Agent announcement, 1997](https://news.microsoft.com/source/1997/09/08/microsoft-agent-released-to-the-web-for-free-download/)
- [Microsoft Agent discontinuation](https://support.microsoft.com/vi-vn/topic/microsoft-agent-enabled-programs-do-not-work-in-windows-7-7e536639-1b8c-eff8-4a80-af207909b28e)
- [WebLLM documentation](https://webllm.mlc.ai/docs/user/get_started.html)
- [Llama model](https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC)

WebLLM and model weights retain their respective licenses. No third-party model weights or music recordings are bundled. Peedy artwork and animations are Microsoft character assets, not artwork created for this project. The animation player's implementation is new; third-party software licensing does not confer ownership of Microsoft artwork. See `ASSET_CREDITS.md` for asset and recording provenance.
