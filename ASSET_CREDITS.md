# Peedy image provenance

- File: `dist/assets/peedy-original.jpg`
- Subject: Peedy from Microsoft Research’s Persona project.
- Source page: https://kurlander.net/DJ/Projects/Peedy/resources
- Original image: https://kurlander.net/DJ/Projects/Peedy/Peedy%20Speaks%20-%20CHI.jpg
- Source caption: Video of Peedy that appeared at CHI ’95.
- Dimensions: 260 × 260 pixels, JPEG.
- Treatment: downloaded unchanged, including the original background; displayed at its original aspect ratio. No AI generation, redraw, background removal, or upscaling was applied to the file.
- Credit: Microsoft Persona project. Character and animation: Tim Skelly. Archive maintained by David (DJ) Kurlander.
- Authorship reference: https://kurlander.net/DJ/Pubs/imagina98p.pdf

The archival page does not state a reusable image license. This project does not claim ownership of the image or grant rights to it. Peedy and Microsoft branding remain attributed to their respective owners. The modern companion code is an independent implementation, not recovered Microsoft software or an official Microsoft release.

## Original Microsoft Agent animation

`dist/assets/peedy-agent/map.png` contains the unchanged original Peedy sprites (4000 × 4096), and `agent.json` is the corresponding animation metadata. The Microsoft Agent-era presentation is explicitly identified in the character selector; the CHI ’95 Persona portrait remains selectable.

Source: [pithings/clippy](https://github.com/pithings/clippy), commit `748f199f0187f6f94ce395cdd55081f513476156`, `src/agents/peedy/map.png` and `agent.ts`. TypeScript object syntax was converted to JSON; artwork was not redrawn. Microsoft owns the character assets. The upstream MIT license applies to code, not Microsoft artwork. The browser renderer in this project is a new implementation of the frame format.

Animation names and behavior: https://learn.microsoft.com/en-us/windows/win32/lwef/microsoft-agent-animations-for-peedy-character

Speech drives original gesture animations. This export does not contain phoneme/viseme mouth overlays, so it does not provide historical lip synchronization.

## Music recordings

Starter recordings stream unchanged from Wikimedia Commons. Individual performer, license, and source links appear beside every recording in the music library and in `dist/music-library.js`. The app does not download or redistribute these recordings in its source package. User-selected audio stays in the browser.
