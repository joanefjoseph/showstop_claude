#!/usr/bin/env python3
"""Create a PDF copy of every file in a project directory, recursively.

Run it inside the project (or pass the project directory as an argument):

    python project_to_pdf.py                  # current directory
    python project_to_pdf.py path/to/frontend
    python project_to_pdf.py --include "*.py"
    python project_to_pdf.py --ignore-file validate.ts --ignore-file ".env*"
    python project_to_pdf.py --no-project-name

Each file becomes  <filename>_<ext>(<project>).pdf  inside a new folder
<project>_pdfs in the project, e.g. frontend/src/main.tsx becomes
frontend/frontend_pdfs/main_tsx(frontend).pdf.  If two files share a name,
their parent directory is added to tell them apart:
routes/validate.ts -> routes_validate_ts(frontend).pdf
src/types/validate.ts -> types_validate_ts(frontend).pdf
With --no-project-name the "(frontend)" part is left off.

Text files of any kind (.py .sql .js .ts .tsx .css .html .json .yaml, files
without an extension, ...) are laid out as plain text with the file path in
the page header.  Images are embedded.  PDFs and other binary files are
skipped, as are the directories in IGNORED_DIRS (.git, node_modules, ...)
and anything matched by --ignore (directories) or --ignore-file (files).
With --include, only files matching one of its patterns are converted.

Requires Python 3.8+ and:  pip install pillow reportlab
"""

import argparse
import codecs
import functools
import os
import re
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageOps, ImageSequence
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Directories that are never worth converting. Add more with --ignore.
IGNORED_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "__pycache__", ".venv", "venv",
    ".mypy_cache", ".pytest_cache", ".ruff_cache", ".tox", ".next", ".cache",
}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".jfif", ".gif", ".bmp", ".tif", ".tiff", ".webp"}

# Page layout for text files (lengths in points; 72 points = 1 inch).
PAGE_SIZE = A4  # or reportlab.lib.pagesizes.letter
MARGIN = 54
FONT_SIZE = 9
LINE_HEIGHT = 11
HEADER_SIZE = 8
DEFAULT_FONT = "Courier"


class Unsupported(Exception):
    """Raised for files this script does not know how to convert."""


# ---------------------------------------------------------------- images

def image_to_pdf(src, dst, title):
    pages = []
    with Image.open(src) as img:
        for frame in ImageSequence.Iterator(img):
            frame = ImageOps.exif_transpose(frame)  # honour camera rotation
            if "A" in frame.getbands() or "transparency" in frame.info:
                # Flatten transparent areas onto white instead of black.
                frame = frame.convert("RGBA")
                flat = Image.new("RGB", frame.size, "white")
                flat.paste(frame, mask=frame.getchannel("A"))
                frame = flat
            elif frame.mode not in ("1", "L", "RGB"):
                frame = frame.convert("RGB")
            pages.append(frame)
            if img.format != "TIFF":
                break  # TIFF frames are pages; GIF/WebP frames are animation
    pages[0].save(dst, "PDF", save_all=True, append_images=pages[1:],
                  quality=95, title=title)


# ------------------------------------------------------------ plain text

def read_text(path):
    """Return the file's text, or raise Unsupported if it looks like binary data."""
    with open(path, "rb") as f:
        head = f.read(8192)
        is_utf16 = head.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE))
        if b"\x00" in head and not is_utf16:
            raise Unsupported
        data = head + f.read()
    if is_utf16:
        return data.decode("utf-16", errors="replace")
    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("cp1252", errors="replace")


@functools.lru_cache(maxsize=None)
def char_width(ch, font):
    return pdfmetrics.stringWidth(ch, font, FONT_SIZE)


def wrap_line(line, font, max_width):
    """Split a line into pieces that fit within max_width points.

    Breaks after a space where possible, otherwise in the middle of a word.
    """
    pieces = []
    start = 0  # index where the current piece begins
    width = 0.0  # width of the current piece so far
    break_at = None  # index just after the last space we could break at
    width_at_break = 0.0
    seen_text = False  # leading indentation is not a place to break
    for i, ch in enumerate(line):
        ch_width = char_width(ch, font)
        if ch == " ":
            if seen_text:
                break_at, width_at_break = i + 1, width + ch_width
        else:
            seen_text = True
            if width + ch_width > max_width and i > start:
                if break_at is None:  # no space in this piece: split the word
                    break_at, width_at_break = i, width
                pieces.append(line[start:break_at])
                start, width, break_at = break_at, width - width_at_break, None
        width += ch_width
    pieces.append(line[start:])
    return pieces


def text_to_pdf(src, dst, title, font):
    text = read_text(src)
    page_width, page_height = PAGE_SIZE
    max_width = page_width - 2 * MARGIN
    top = page_height - MARGIN - FONT_SIZE
    header_y = page_height - MARGIN + 12

    pdf = canvas.Canvas(str(dst), pagesize=PAGE_SIZE)
    pdf.setTitle(title)
    page = 0

    def start_page():
        nonlocal page
        page += 1
        pdf.setFont("Helvetica", HEADER_SIZE)
        pdf.setFillGray(0.45)
        pdf.drawString(MARGIN, header_y, title)
        pdf.drawRightString(page_width - MARGIN, header_y, f"page {page}")
        pdf.setFillGray(0)
        pdf.setFont(font, FONT_SIZE)
        return top

    y = start_page()
    for line in text.splitlines():
        for piece in wrap_line(line.expandtabs(4), font, max_width):
            if y < MARGIN:
                pdf.showPage()
                y = start_page()
            pdf.drawString(MARGIN, y, piece)
            y -= LINE_HEIGHT
    pdf.showPage()
    pdf.save()

    if font == DEFAULT_FONT:
        try:
            text.encode("cp1252")
        except UnicodeEncodeError:
            return "some characters are missing from the built-in font; see --font"
    return None


# ------------------------------------------------------- choosing files

def make_matcher(patterns):
    """Build a function that tells whether a project-relative path matches.

    In a pattern, * matches any run of characters within a name; everything
    else is literal. A pattern without a slash is compared with the file or
    directory name alone, so it matches at any depth ("validate.ts", ".env*").
    A pattern with a slash is compared with the whole path relative to the
    project ("routes/validate.ts").
    """
    compiled = []
    for pattern in patterns:
        pattern = pattern.replace(os.sep, "/").strip("/")
        regex = re.compile("[^/]*".join(map(re.escape, pattern.split("*"))))
        compiled.append(("/" in pattern, regex))

    def matches(rel_path):  # e.g. "src/types/validate.ts"
        name = rel_path.rsplit("/", 1)[-1]
        return any(regex.fullmatch(rel_path if whole_path else name)
                   for whole_path, regex in compiled)

    return matches


def find_files(project_dir, out_dir, ignore_dir, ignore_file, include=None):
    """Return (files to convert, files left out by ignore_file).

    PDFs, the output directory, directories matched by ignore_dir and (when
    include is given) files that include does not match are left out
    without being listed.
    """
    files, ignored = [], []
    for root, dirs, names in os.walk(project_dir):
        root = Path(root)
        rel_root = root.relative_to(project_dir)

        def rel(name):
            return (rel_root / name).as_posix()

        dirs[:] = sorted(d for d in dirs if not ignore_dir(rel(d)) and root / d != out_dir)
        for name in sorted(names):
            path = root / name
            if not path.is_file() or path.suffix.lower() == ".pdf":
                continue
            if include and not include(rel(name)):
                continue
            (ignored if ignore_file(rel(name)) else files).append(path)
    return files, ignored


def pdf_names(files, project_dir, suffix):
    """Map each file to a unique PDF name.

    main.tsx -> main_tsx<suffix>.pdf, where suffix is "(project)" or "".
    When names clash, parent directories are prepended (nearest first) only
    to the files that need them.
    """
    parts = {f: f.relative_to(project_dir).parts for f in files}
    depth = {f: 1 for f in files}  # how many trailing path parts the name uses

    def base(f):
        return "_".join(parts[f][-depth[f]:]).replace(".", "_")

    while True:
        counts = Counter(base(f).lower() for f in files)
        clashing = [f for f in files
                    if counts[base(f).lower()] > 1 and depth[f] < len(parts[f])]
        if not clashing:
            break
        for f in clashing:
            depth[f] += 1

    # Anything still identical (e.g. a.b.js next to a_b.js) gets a number.
    counts = Counter(base(f).lower() for f in files)
    seen = Counter()
    names = {}
    for f in files:
        name = base(f)
        if counts[name.lower()] > 1:
            seen[name.lower()] += 1
            name = f"{name}_{seen[name.lower()]}"
        names[f] = f"{name}{suffix}.pdf"
    return names


# ------------------------------------------------------------------ main

def convert(src, dst, title, font):
    """Write a PDF version of src to dst. May return a note for the user."""
    if src.suffix.lower() in IMAGE_EXTS:
        image_to_pdf(src, dst, title)
        return None
    return text_to_pdf(src, dst, title, font)  # raises Unsupported for binary files


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("project_dir", nargs="?", default=".", type=Path,
                        help="project directory (default: the current directory)")
    parser.add_argument("-o", "--output-dir", type=Path,
                        help="where to write the PDFs (default: PROJECT_DIR/<project>_pdfs)")
    parser.add_argument("--no-project-name", action="store_true",
                        help="name PDFs main_tsx.pdf instead of main_tsx(project).pdf")
    parser.add_argument("--include", action="append", default=[], metavar="PATTERN",
                        help='convert only files matching this, e.g. "*.py" or main.tsx; '
                             "* is a wildcard (can be repeated)")
    parser.add_argument("--ignore", action="append", default=[], metavar="PATTERN",
                        help="directory to skip, in addition to the built-in list; "
                             "* is a wildcard (can be repeated)")
    parser.add_argument("--ignore-file", action="append", default=[], metavar="PATTERN",
                        help='file to skip, e.g. validate.ts or ".env*"; '
                             "* is a wildcard (can be repeated)")
    parser.add_argument("--font", type=Path,
                        help="TrueType font (.ttf) for text files, e.g. for non-Latin scripts")
    args = parser.parse_args()

    project_dir = args.project_dir.resolve()
    if not project_dir.is_dir():
        parser.error(f"not a directory: {args.project_dir}")
    project = project_dir.name
    out_dir = (args.output_dir or project_dir / f"{project}_pdfs").resolve()
    suffix = "" if args.no_project_name else f"({project})"

    font = DEFAULT_FONT
    if args.font:
        try:
            pdfmetrics.registerFont(TTFont("CustomFont", str(args.font)))
        except Exception as exc:
            parser.error(f"cannot load font {args.font}: {exc}")
        font = "CustomFont"

    files, ignored = find_files(
        project_dir, out_dir,
        ignore_dir=make_matcher(IGNORED_DIRS | set(args.ignore)),
        ignore_file=make_matcher(args.ignore_file),
        include=make_matcher(args.include) if args.include else None,
    )
    for path in ignored:
        print(f"ignored    {path.relative_to(project_dir).as_posix()}")
    if not files:
        which = " that match --include" if args.include else ""
        print(f"No files to convert in {project_dir}{which}")
        return 0
    names = pdf_names(files, project_dir, suffix)
    out_dir.mkdir(parents=True, exist_ok=True)

    tally = Counter()
    for src in files:
        rel = src.relative_to(project_dir).as_posix()
        dst = out_dir / names[src]
        partial = dst.with_name(dst.name + ".part")  # only finished PDFs get the real name
        try:
            note = convert(src, partial, f"{project}/{rel}", font)
            os.replace(partial, dst)
        except Unsupported:
            tally["skipped"] += 1
            print(f"skipped    {rel} (binary file)")
        except Exception as exc:  # one bad file should not stop the rest
            tally["failed"] += 1
            print(f"FAILED     {rel} ({exc})")
        else:
            tally["converted"] += 1
            print(f"converted  {rel} -> {dst.name}" + (f" (note: {note})" if note else ""))
        finally:
            partial.unlink(missing_ok=True)

    print(f"\n{tally['converted']} converted, {tally['skipped']} skipped, "
          f"{tally['failed']} failed, {len(ignored)} ignored. PDFs are in {out_dir}")
    return 1 if tally["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())