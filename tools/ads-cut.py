# -*- coding: utf-8 -*-
"""Cut short Yandex advertising videos from the existing catalog trailers."""
import subprocess
from pathlib import Path

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "docs" / "store"
OUT = STORE / "ads"
OUT.mkdir(exist_ok=True)

SOURCES = {
    "16x9": (STORE / "video-16x9.mp4", 1920, 1080),
    "9x16": (STORE / "video-9x16.mp4", 1080, 1920),
}

# start, duration — skip the menu, hook on tiles / win
CLIPS = [
    ("ad-6s-play", 8.0, 6.0),
    ("ad-6s-win", 13.8, 6.0),
    ("ad-10s-win", 9.5, 10.0),
    ("ad-15s", 5.0, 15.0),
]


def encode(src: Path, dest: Path, start: float, dur: float, width: int, height: int) -> None:
    fade_out = max(0.05, dur - 0.35)
    vf = (
        f"scale={width}:{height}:flags=lanczos,setsar=1,"
        f"fade=t=in:st=0:d=0.25,fade=t=out:st={fade_out:.2f}:d=0.35,"
        "format=yuv420p"
    )
    af = f"afade=t=in:st=0:d=0.2,afade=t=out:st={fade_out:.2f}:d=0.35"
    cmd = [
        FFMPEG, "-hide_banner", "-y",
        "-ss", f"{start:.2f}",
        "-i", str(src),
        "-t", f"{dur:.2f}",
        "-vf", vf,
        "-af", af,
        "-r", "30",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ac", "2",
        "-movflags", "+faststart",
        str(dest),
    ]
    subprocess.run(cmd, check=True)


for name, start, dur in CLIPS:
    for label, (src, w, h) in SOURCES.items():
        dest = OUT / f"{name}-{label}.mp4"
        print(f"encode {dest.name}")
        encode(src, dest, start, dur, w, h)
        print(f"  {dest.stat().st_size // 1024} KB")
