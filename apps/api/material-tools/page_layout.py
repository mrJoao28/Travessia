"""Conservative reading order for ruled tables and clear two-column pages."""
from bisect import bisect_left
import re

_MATH = re.compile(r"[∑∫√∞≤≥±≈∂∇⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]|\w\s*[=≠]\s*\w")


def _text_regions(page, words):
    """Use a clear gutter only where both columns have sustained text."""
    if not words:
        return "", False
    left_edge, _, right_edge, _ = page.bbox
    width = right_edge - left_edge
    center = left_edge + width / 2
    gap = width * .012
    left = [w for w in words if w["x1"] <= center - gap]
    right = [w for w in words if w["x0"] >= center + gap]
    right_tops = sorted(w["top"] for w in right)
    paired = [w for w in left
              if bisect_left(right_tops, w["top"] - 6) < bisect_left(right_tops, w["top"] + 6)]
    levels = sorted({round(w["top"] / 8) for w in paired})
    if len(levels) >= 5:
        top = min(w["top"] for w in paired) - 6
        bottom = max(w["bottom"] for w in paired) + 6
        body = [w for w in words if top <= w["top"] < bottom]
        if all(w["x1"] <= center - gap or w["x0"] >= center + gap for w in body):
            pieces = [
                [w for w in words if w["top"] < top],
                [w for w in body if w["x1"] <= center - gap],
                [w for w in body if w["x0"] >= center + gap],
                [w for w in words if w["top"] >= bottom],
            ]
            return "\n\n".join(_lines(piece) for piece in pieces if piece), True
    return _lines(words), False


def _lines(words):
    lines = []
    top = None
    for word in sorted(words, key=lambda word: word["top"]):
        if top is None or word["top"] - top > 4:
            top = word["top"]
            lines.append([])
        lines[-1].append(word)
    return "\n".join(" ".join(w["text"] for w in sorted(line, key=lambda word: word["x0"])) for line in lines)


def extract_page(page):
    # Keep the ordinary extractor for pages without a detected table or gutter.
    original = page.extract_text(layout=False) or ""
    words = page.extract_words()
    tables = sorted(page.find_tables(), key=lambda table: (table.bbox[1], table.bbox[0]))
    if tables:
        def inside_table(word):
            x = (word["x0"] + word["x1"]) / 2
            y = (word["top"] + word["bottom"]) / 2
            return any(x0 <= x <= x1 and top <= y <= bottom for x0, top, x1, bottom in (table.bbox for table in tables))

        remaining = [word for word in words if not inside_table(word)]
        blocks = []
        columns = False
        for table in tables:
            before = [w for w in remaining if w["top"] < table.bbox[1]]
            remaining = [w for w in remaining if w["top"] >= table.bbox[1]]
            text, detected = _text_regions(page, before)
            columns |= detected
            if text:
                blocks.append(text)
            cells = [" | ".join(" ".join((cell or "").split()) for cell in row) for row in table.extract()]
            blocks.append("Tabela:\n" + "\n".join(cells))
        after, detected = _text_regions(page, remaining)
        columns |= detected
        if after:
            blocks.append(after)
        text = "\n\n".join(blocks)
    else:
        ordered, columns = _text_regions(page, words)
        text = ordered if columns else original
    flags = []
    if tables:
        flags.append("tabela extraída por linhas e células")
    if columns:
        flags.append("colunas organizadas em ordem de leitura")
    if _MATH.search(original):
        flags.append("possível notação matemática")
    return text, flags
