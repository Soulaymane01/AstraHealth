# AstraHealth — Demo Videos

The submission cut is **30 seconds**. Two versions share the same app footage:

| File | Length | Description |
|---|---:|---|
| `AstraHealth-Power-Astronaut-30s.mp4` | 0:30 | Branded cut: **Presented by Power Astronaut** |
| `AstraHealth-App-Demo-30s.mp4` | 0:30 | App-only cut, no team branding |
| `AstraHealth-Voiceover-30s.mp3` | 0:30 | Voice track, ready to replace |
| `AstraHealth-Power-Astronaut-30s.srt` | — | Captions for the branded cut |
| `AstraHealth-App-Demo-30s.srt` | — | Captions for the app-only cut |
| `poster-30s.jpg` | — | Poster frame |

**Resolution:** 1920×1080, 30 fps, H.264 + AAC.
**Script:** [`../VIDEO_SCRIPT_30S.md`](../VIDEO_SCRIPT_30S.md).
**Live app:** <https://astrahealth-gamma.vercel.app>.

## Chapters

| Time | Chapter |
|---|---|
| 0:00 | Intro |
| 0:03 | Flight Deck / readiness |
| 0:10 | 3D body systems |
| 0:18 | Systems Check |
| 0:21 | Flight Surgeon console |
| 0:26 | Outro |

## Audio

The voice is a neural TTS voice (`en-US-AndrewNeural`, rate `+2%`, pitch `-2Hz`).
There is no music bed, so the narration is easy to replace.

To replace the voice track:

```bash
ffmpeg -i AstraHealth-Power-Astronaut-30s.mp4 \
  -i your-voiceover.wav \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -shortest \
  AstraHealth-Power-Astronaut-30s-v2.mp4
```

Keep the new track at 30 seconds for a clean fit.

## Extended versions

The earlier 3-minute cuts are in [`extended/`](extended/) with their own
captions and voiceover. They are optional; the 30-second cuts are the ones
linked from the main README.

## Notes

- The demo uses the seeded day-42 mission and the two demo accounts.
- The surgeon sequence uses `surgeon@astra.space`.
- “Power Astronaut” is used as the team name in the branded cut. If the official
  name is styled differently, only the intro/outro cards and two narration lines
  need to change.
