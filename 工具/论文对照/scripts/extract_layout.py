#!/usr/bin/env python3
"""Extract reading-order segments from an academic PDF.

Handles the two problems that break naive extraction on TeX-produced PDFs:
  1. dvipdfm stores no space characters; word gaps must be rebuilt from glyph
     x-positions.
  2. Two-column pages must be read column-by-column, with full-width blocks
     (title, abstract) splitting the page into ordered bands.

Usage:
    python extract_layout.py input.pdf segments.json [--debug]
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import statistics

import pdfplumber

MATH_FONT_RE = re.compile(
    r"(CMMI|CMSY|CMEX|CMBSY|CMSS|CMTT|CMR\d|MSBM|EUFM|EUSM|StandardSymL|rsfs|Math)",
    re.I,
)
BOLD_FONT_RE = re.compile(r"(Medi|Bold|Black|Heavy|Semibold)", re.I)
REPEAT_MARGIN = 0.08  # top/bottom fraction scanned for running headers/footers
X_GAP = 10.0  # glyph gap (pt) that separates two runs inside one baseline band


def is_math_font(name: str) -> bool:
    return bool(MATH_FONT_RE.search(name or ""))


def space_threshold(size: float) -> float:
    """Glyph gap (pt) above which a space is inserted.

    Measured on TeX/Nimbus output at 9pt: intra-word gaps cluster below 1.2pt,
    inter-word gaps above 1.6pt, so 0.16*size separates them cleanly.
    """
    return max(1.2, 0.16 * size)


def detect_columns(chars, page_width):
    """Return the x coordinate separating the two columns, or None if single column."""
    band = [c for c in chars if c["x0"] > page_width * 0.25 and c["x1"] < page_width * 0.75]
    if len(band) < 40:
        return None
    bins = collections.Counter(int(c["x0"] // 4) * 4 for c in band)
    lo, hi = int(page_width * 0.35), int(page_width * 0.65)
    empties = [x for x in range(lo, hi, 4) if bins.get(x, 0) == 0]
    if not empties:
        return None
    runs, run = [], [empties[0]]
    for x in empties[1:]:
        if x - run[-1] == 4:
            run.append(x)
        else:
            runs.append(run)
            run = [x]
    runs.append(run)
    widest = max(runs, key=len)
    if len(widest) * 4 < 8:
        return None
    return (widest[0] + widest[-1] + 4) / 2.0


def build_rows(chars, body_size, col_split, page_x0, page_x1):
    """Cluster glyphs into text lines, column-aware.

    Grouping on `top` alone fuses the left-column and right-column line that
    share a baseline into a single interleaved row. The fix is three passes:
    band by baseline, split each band into runs at large x-gaps (the gutter),
    then merge the runs belonging to the same column.

    Only body-size glyphs seed bands; smaller glyphs (super/subscripts) are
    attached afterwards, otherwise every superscript becomes its own line.
    """
    small = [c for c in chars if c["size"] < body_size * 0.9]
    main = [c for c in chars if c["size"] >= body_size * 0.9]
    if not main:
        main, small = chars, []
    main.sort(key=lambda c: (c["top"], c["x0"]))
    bands = []
    for c in main:
        if bands and c["top"] - bands[-1]["top"] <= body_size * 0.55:
            bands[-1]["chars"].append(c)
            bands[-1]["bottom"] = max(bands[-1]["bottom"], c["bottom"])
        else:
            bands.append({"chars": [c], "top": c["top"], "bottom": c["bottom"]})
    rows = []
    text_width = max(1.0, page_x1 - page_x0)
    for band in bands:
        ordered_band = sorted(band["chars"], key=lambda c: c["x0"])
        runs = [[ordered_band[0]]]
        for c in ordered_band[1:]:
            if c["x0"] - runs[-1][-1]["x1"] <= X_GAP:
                runs[-1].append(c)
            else:
                runs.append([c])
        # Classify each run as left / right / full-width. A run that crosses the
        # split is a full-width element only if it really spans the text block;
        # otherwise it is a column artefact (an indented algorithm line, a
        # hanging indent) and must be cut at the split. Testing the page's outer
        # text edges does not work: on a page whose top matter is full width
        # while the body is two columns, no full-width line ever reaches both
        # column edges. Width plus how evenly the run straddles the gutter is
        # the reliable signal.
        pieces = []
        for run in runs:
            x0, x1 = run[0]["x0"], run[-1]["x1"]
            if x0 < col_split < x1:
                width = x1 - x0
                left_ext = col_split - x0
                right_ext = x1 - col_split
                balanced = min(left_ext, right_ext) >= 0.35 * max(left_ext, right_ext)
                centered = abs((x0 + x1) / 2.0 - col_split) <= 0.03 * text_width
                if (
                    width >= 0.70 * text_width
                    or (balanced and width >= 0.30 * text_width)
                    or (centered and width >= 0.15 * text_width)
                ):
                    pieces.append((2, list(run)))
                else:
                    lhs = [c for c in run if (c["x0"] + c["x1"]) / 2 < col_split]
                    rhs = [c for c in run if (c["x0"] + c["x1"]) / 2 >= col_split]
                    if lhs:
                        pieces.append((0, lhs))
                    if rhs:
                        pieces.append((1, rhs))
                continue
            pieces.append((0 if (x0 + x1) / 2 < col_split else 1, list(run)))
        merged = []
        for side, cs in pieces:
            if merged and merged[-1]["side"] == side:
                merged[-1]["chars"].extend(cs)
            else:
                merged.append({"chars": list(cs), "side": side})
        for m in merged:
            rows.append({"chars": m["chars"], "side": m["side"], "top": band["top"], "bottom": band["bottom"]})
    for c in small:
        cy = (c["top"] + c["bottom"]) / 2.0
        best, best_d = None, 1e9
        for r in rows:
            if not (r["top"] - 2 <= cy <= r["bottom"] + 2):
                continue
            x0 = min(ch["x0"] for ch in r["chars"])
            x1 = max(ch["x1"] for ch in r["chars"])
            if c["x0"] < x0 - 8 or c["x0"] > x1 + 8:
                continue
            d = abs(cy - (r["top"] + r["bottom"]) / 2.0)
            if d < best_d:
                best, best_d = r, d
        if best is not None:
            best["chars"].append(c)
    for r in rows:
        r["chars"].sort(key=lambda c: c["x0"])
        r["x0min"] = min(c["x0"] for c in r["chars"])
        r["x1max"] = max(c["x1"] for c in r["chars"])
        r["top"] = min(c["top"] for c in r["chars"])
        r["bottom"] = max(c["bottom"] for c in r["chars"])
    rows.sort(key=lambda r: (r["top"], r["x0min"]))
    return rows


def row_text(row, body_size):
    """Rebuild the string of a row, inserting spaces from glyph gaps."""
    out = []
    prev = None
    for c in row["chars"]:
        if prev is not None:
            gap = c["x0"] - prev["x1"]
            if gap >= space_threshold(body_size) and not out[-1].endswith(" "):
                out.append(" ")
        out.append(c["text"])
        prev = c
    return "".join(out).strip()


def row_span(row):
    return min(c["x0"] for c in row["chars"]), max(c["x1"] for c in row["chars"])


def math_ratio(row):
    if not row["chars"]:
        return 0.0
    return sum(1 for c in row["chars"] if is_math_font(c["fontname"])) / len(row["chars"])


def bold_ratio(row):
    """Fraction of glyphs drawn in a bold/medium face.

    Section headings in this style of paper are the same point size as the body
    and are distinguished only by weight, so size thresholds cannot find them.
    """
    if not row["chars"]:
        return 0.0
    return sum(1 for c in row["chars"] if BOLD_FONT_RE.search(c["fontname"] or "")) / len(row["chars"])


def dominant_size(row):
    return statistics.median(c["size"] for c in row["chars"])


def quantile(values, q):
    if not values:
        return 0.0
    vals = sorted(values)
    i = min(len(vals) - 1, max(0, int(round(q * (len(vals) - 1)))))
    return vals[i]


def band_edges(rows):
    """Robust left/right edges of a group of rows.

    Extremes are useless here: one stray centred display equation would move the
    column edge by 20pt and make every justified line look short.
    """
    return quantile([r["x0min"] for r in rows], 0.1), quantile([r["x1max"] for r in rows], 0.9)


def drop_running_headers(pages_rows, page_height):
    """Remove lines that repeat in the page margins across most pages."""
    seen = collections.Counter()
    n = len(pages_rows)
    for rows in pages_rows:
        for r in rows:
            if r["top"] < page_height * REPEAT_MARGIN or r["bottom"] > page_height * (1 - REPEAT_MARGIN):
                key = re.sub(r"\d+", "#", r["text"])[:60]
                if len(key) > 12:
                    seen[key] += 1
    repeated = {k for k, v in seen.items() if v >= max(2, n * 0.4)}
    for rows in pages_rows:
        rows[:] = [
            r
            for r in rows
            if not (
                (r["top"] < page_height * REPEAT_MARGIN or r["bottom"] > page_height * (1 - REPEAT_MARGIN))
                and re.sub(r"\d+", "#", r["text"])[:60] in repeated
            )
        ]


def merge_hyphen(text, nxt):
    if text.endswith("-") and not text.endswith(("- ", "--")):
        return text[:-1] + nxt.lstrip()
    return text + " " + nxt


def group_paragraphs(rows, body_size, col_left, col_right):
    """Merge rows into paragraph blocks using leading, indentation and style."""
    if not rows:
        return []
    short_edge = col_right - 2.5  # justified lines end exactly at the column edge
    deltas = [
        rows[i]["top"] - rows[i - 1]["top"]
        for i in range(1, len(rows))
        if 0 < rows[i]["top"] - rows[i - 1]["top"] < body_size * 3
    ]
    leading = statistics.median(deltas) if deltas else body_size * 1.2
    blocks, cur = [], None
    for r in rows:
        size = dominant_size(r)
        text = r["text"]
        starts_item = bool(re.match(r"^([•·▪‣]|\(?\d+[.)]|\d+\s*[.)])\s", text))
        if cur is None:
            new = True
        else:
            gap = r["top"] - cur["rows"][-1]["top"]
            size_shift = abs(size - cur["size"]) > max(0.6, body_size * 0.08)
            prev_short = cur["rows"][-1]["x1max"] < short_edge
            weight_shift = (bold_ratio(r) > 0.6) != (cur["bold"] > 0.6)
            new = (
                gap > leading * 1.28
                or size_shift
                or weight_shift
                or starts_item
                or (prev_short and not cur["last_hyphen"])
            )
        if new:
            cur = {
                "rows": [r],
                "size": size,
                "text": text,
                "last_hyphen": text.endswith("-"),
                "top": r["top"],
                "bottom": r["bottom"],
                "x0min": r["x0min"],
                "x1max": r["x1max"],
                "math": math_ratio(r),
                "bold": bold_ratio(r),
                "nrows": 1,
                "items": 1 if starts_item else 0,
            }
            blocks.append(cur)
        else:
            cur["text"] = merge_hyphen(cur["text"], text)
            cur["last_hyphen"] = text.endswith("-")
            cur["rows"].append(r)
            cur["bottom"] = max(cur["bottom"], r["bottom"])
            cur["x0min"] = min(cur["x0min"], r["x0min"])
            cur["x1max"] = max(cur["x1max"], r["x1max"])
            m = math_ratio(r)
            cur["math"] += m
            cur["bold"] = max(cur["bold"], bold_ratio(r))
            cur["nrows"] += 1
            if starts_item:
                cur["items"] += 1
    return blocks


def classify(block, body_size, col_width):
    text = block["text"]
    size = block["size"]
    math_share = block["math"] / max(1, block["nrows"])
    if re.match(r"^(Figure|Table|Fig\.)\s*\d", text):
        return "caption"
    if size >= body_size * 1.55:
        return "title"
    if size >= body_size * 1.08 or (block.get("bold", 0) > 0.6 and len(text) < 120):
        return "heading"
    if math_share >= 0.5 and len(text) < 220:
        return "formula"
    if block["items"] >= 2:
        return "list"
    if re.match(r"^(Abstract|References|Acknowledg)", text, re.I) and size >= body_size * 0.95:
        return "heading"
    return "body"


def heading_level(size, body_size):
    ratio = size / body_size
    if ratio >= 1.5:
        return 1
    if ratio >= 1.18:
        return 2
    return 3


def group_full_rows(rows, body_size):
    """Merge vertically adjacent full-width rows into bands.

    A full-width block (title, author line, abstract, ACM category list) is set
    as several consecutive full-width rows. Emitting them one row per segment
    would shred the block into fragments, so cluster rows whose leading matches
    before handing them to the paragraph grouper.
    """
    groups = []
    for r in rows:
        if groups and r["top"] - groups[-1][-1]["bottom"] <= body_size * 0.6:
            groups[-1].append(r)
        else:
            groups.append([r])
    return groups


def order_page(rows, body_size):
    """Order rows into paragraph blocks: full-width lines split the page into
    bands; inside a band the left column is read before the right column."""
    full = sorted([r for r in rows if r["side"] == 2], key=lambda r: r["top"])
    sided = [r for r in rows if r["side"] != 2]
    edges = {}
    for side in (0, 1):
        group = [r for r in sided if r["side"] == side]
        if group:
            edges[side] = (min(r["x0min"] for r in group), max(r["x1max"] for r in group))
    groups = group_full_rows(full, body_size)
    regions, prev = [], -1e9
    for g in groups:
        regions.append((prev, g[0]["top"] - 1))
        prev = g[-1]["bottom"] + 1
    regions.append((prev, 1e9))
    ordered = []
    for i, (lo, hi) in enumerate(regions):
        for side in (0, 1):
            group = sorted(
                [r for r in sided if r["side"] == side and lo <= (r["top"] + r["bottom"]) / 2 < hi],
                key=lambda r: r["top"],
            )
            if not group:
                continue
            col_left, col_right = edges.get(side, (0, 600))
            for b in group_paragraphs(group, body_size, col_left, col_right):
                b["col"] = side
                b["kind"] = classify(b, body_size, col_right - col_left)
                ordered.append(b)
        if i < len(groups):
            g = groups[i]
            col_left = min(r["x0min"] for r in g)
            col_right = max(r["x1max"] for r in g)
            for b in group_paragraphs(g, body_size, col_left, col_right):
                b["col"] = 2
                b["kind"] = classify(b, body_size, col_right - col_left)
                ordered.append(b)
    return ordered


def image_regions(page):
    return [{"bbox": (im["x0"], im["top"], im["x1"], im["bottom"])} for im in page.images]


def extract(path, debug=False):
    segments = []
    with pdfplumber.open(path) as pdf:
        page_width, page_height = pdf.pages[0].width, pdf.pages[0].height
        all_chars = [list(p.chars) for p in pdf.pages]
        sizes = collections.Counter(round(c["size"], 1) for chars in all_chars for c in chars)
        body_size = sizes.most_common(1)[0][0]
        pages_rows, splits = [], []
        for page, chars in zip(pdf.pages, all_chars):
            split = detect_columns(chars, page.width)
            if split is None:
                split = page.width / 2.0
            splits.append(split)
            # Seed rows with the page's own dominant size. Reference lists and
            # appendices are often set smaller than the paper body, and seeding
            # with the global body size would leave them unattached.
            page_sizes = collections.Counter(round(c["size"], 1) for c in chars)
            page_size = page_sizes.most_common(1)[0][0] if page_sizes else body_size
            page_x0 = min(c["x0"] for c in chars)
            page_x1 = max(c["x1"] for c in chars)
            rows = build_rows(chars, max(page_size, body_size * 0.75), split, page_x0, page_x1)
            for r in rows:
                r["text"] = row_text(r, body_size)
            pages_rows.append(rows)
        drop_running_headers(pages_rows, page_height)
        for pno, (page, rows, split) in enumerate(zip(pdf.pages, pages_rows, splits), 1):
            if not rows:
                continue
            ordered = order_page([r for r in rows if r["text"]], body_size)
            # Page 1: everything above the abstract is title-block metadata
            # (authors, affiliation, ACM category codes), not section headings.
            # The cut must be the abstract heading itself: keying off relative
            # size instead would also demote "1. Introduction".
            if pno == 1:
                abstract_top = min(
                    (b["top"] for b in ordered if b["kind"] == "heading" and b["text"].strip().lower().startswith("abstract")),
                    default=None,
                )
                if abstract_top is not None:
                    for b in ordered:
                        if b["kind"] == "heading" and b["top"] < abstract_top:
                            b["kind"] = "meta"
            for i, b in enumerate(ordered):
                seg = {
                    "id": "p%02d-%03d" % (pno, i + 1),
                    "page": pno,
                    "type": b["kind"],
                    "text": b["text"],
                    "bbox": [round(b["x0min"], 1), round(b["top"], 1), round(b["x1max"], 1), round(b["bottom"], 1)],
                }
                if b["kind"] == "heading":
                    seg["level"] = heading_level(b["size"], body_size)
                m = re.match(r"^(Abstract|References|Acknowledg)", b["text"], re.I)
                if m:
                    seg["special"] = m.group(1).lower()
                segments.append(seg)
            for j, reg in enumerate(image_regions(page), 1):
                segments.append(
                    {
                        "id": "p%02d-img%02d" % (pno, j),
                        "page": pno,
                        "type": "figure",
                        "text": "",
                        "bbox": [round(v, 1) for v in reg["bbox"]],
                    }
                )
            if debug:
                counts = collections.Counter(s["type"] for s in segments if s["page"] == pno)
                print("page %d: split=%s rows=%d %s" % (pno, None if split is None else round(split, 1), len(rows), dict(counts)))
    return {
        "source": path,
        "page_width": round(page_width, 1),
        "page_height": round(page_height, 1),
        "body_size": body_size,
        "segments": segments,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("out")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()
    data = extract(args.pdf, args.debug)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    types = collections.Counter(s["type"] for s in data["segments"])
    print("wrote %s: %d segments %s" % (args.out, len(data["segments"]), dict(types)))


if __name__ == "__main__":
    main()
