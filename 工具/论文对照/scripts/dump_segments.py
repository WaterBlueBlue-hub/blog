#!/usr/bin/env python3
"""Print a compact, human-readable view of a segments.json for review.

Usage:
    python dump_segments.py segments.json [--page N] [--type body]
"""
from __future__ import annotations

import argparse
import json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("segments")
    ap.add_argument("--page", type=int, default=None)
    ap.add_argument("--type", default=None)
    ap.add_argument("--width", type=int, default=110)
    args = ap.parse_args()

    with open(args.segments, encoding="utf-8") as fh:
        data = json.load(fh)
    print(
        "source=%s page_height=%s body_size=%s segments=%d"
        % (data["source"], data["page_height"], data["body_size"], len(data["segments"]))
    )
    for seg in data["segments"]:
        if args.page and seg["page"] != args.page:
            continue
        if args.type and seg["type"] != args.type:
            continue
        text = " ".join(seg["text"].split())
        if len(text) > args.width:
            text = text[: args.width] + "…"
        bbox = ",".join("%.0f" % v for v in seg["bbox"])
        extra = " L%s" % seg.get("level") if "level" in seg else ""
        if "special" in seg:
            extra += " <%s>" % seg["special"]
        print("%-11s %-8s [%s]%s %s" % (seg["id"], seg["type"], bbox, extra, text))


if __name__ == "__main__":
    main()
