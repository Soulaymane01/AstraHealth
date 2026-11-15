# AstraHealth — Demo Videos

Two cuts of the same app story:

| File | Length | Description |
|---|---:|---|
| `AstraHealth-Power-Astronaut.mp4` | 2:58 | Branded intro/outro: **Presented by Power Astronaut** |
| `AstraHealth-App-Demo.mp4` | 2:51 | App-only cut, no team branding |
| `AstraHealth-Voiceover.mp3` | 2:58 | Full voice track, for replacement or reuse |
| `poster.jpg` | — | Poster frame from the branded cut |
| `AstraHealth-Power-Astronaut.srt` | — | Captions for the branded cut |
| `AstraHealth-App-Demo.srt` | — | Captions for the app-only cut |

**Resolution:** 1920×1080, 30 fps, H.264 + AAC.  
**Script:** [`../VIDEO_SCRIPT.md`](../VIDEO_SCRIPT.md).  
**Live app:** <https://astrahealth-gamma.vercel.app>.

## Chapters (branded cut)

| Time | Chapter |
|---|---|
| 0:00 | Intro / Power Astronaut |
| 0:12 | The problem |
| 0:27 | Flight Deck and readiness |
| 0:46 | 3D body systems |
| 0:57 | Explainable score |
| 1:12 | Systems Check |
| 1:27 | Systems Report |
| 1:42 | Mission Log and achievements |
| 1:54 | Mental-health screens |
| 2:07 | Flight Surgeon console |
| 2:24 | Clinical Copilot |
| 2:40 | Privacy and safety |
| 2:49 | Outro |

## Audio

The voice is a neural TTS voice (`en-US-AndrewNeural`, rate `-8%`, pitch `-2Hz`).
There is no music bed, so the narration is easy to replace.

To replace the voice track while keeping the visuals:

```bash
ffmpeg -i AstraHealth-Power-Astronaut.mp4 \
  -i your-voiceover.wav \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -shortest \
  AstraHealth-Power-Astronaut-v2.mp4
```

If the new voice is shorter, the video will end when the audio ends with
`-shortest`. For a precise fit, time-stretch or pad the new track to 2:58 first.

## Notes

- The demo uses the seeded day-42 mission and the two demo accounts.
- The surgeon sequence uses `surgeon@astra.space`.
- The check-in sequence creates one real check-in in the local demo database.
- “Power Astronaut” is used as the team name in the branded cut. If the official
  name is plural or styled differently, only the intro/outro cards and two
  narration lines need to change.
