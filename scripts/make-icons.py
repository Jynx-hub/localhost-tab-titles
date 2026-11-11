#!/usr/bin/env python3
"""Renders extension/icons/icon{16,48,128}.png with the standard library only (no Pillow)."""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "extension", "icons")
BG = (24, 24, 27)       # near-black rounded square
TAB = (244, 244, 245)   # browser-tab silhouette
DOT = (34, 197, 94)     # "server is live" dot


def rounded_rect(x, y, x0, y0, x1, y1, r):
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def shade(u, v):
    """Colour at normalised (u, v) in [0, 1], or None for transparent."""
    if not rounded_rect(u, v, 0.02, 0.02, 0.98, 0.98, 0.22):
        return None
    # Tab: a raised tab on the left joined to a wide body below it.
    if rounded_rect(u, v, 0.16, 0.24, 0.56, 0.50, 0.07) or rounded_rect(u, v, 0.16, 0.40, 0.84, 0.78, 0.07):
        if (u - 0.68) ** 2 + (v - 0.59) ** 2 <= 0.085 ** 2:
            return DOT
        return TAB
    return BG


def render(size, ss=4):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    c = shade((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)
                    if c:
                        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; acc[3] += 1
            n = acc[3]
            row += bytes([acc[0] // n, acc[1] // n, acc[2] // n, 255 * n // (ss * ss)] if n else [0, 0, 0, 0])
        rows.append(bytes(row))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
            + chunk(b"IEND", b""))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for s in (16, 48, 128):
        with open(os.path.join(OUT, f"icon{s}.png"), "wb") as f:
            f.write(render(s))
