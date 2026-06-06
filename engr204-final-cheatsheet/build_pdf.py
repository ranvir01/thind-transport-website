#!/usr/bin/env python3
"""Combine CHEATSHEET.md + WORKED_EXAMPLES.md into one print-ready PDF."""
import markdown
from weasyprint import HTML
import os

HERE = os.path.dirname(os.path.abspath(__file__))

def read(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()

visual = read("VISUAL_GUIDE.md")
solved = read("SOLVED_PROBLEMS.md")
examsol = read("EXAM_SOLUTIONS.md")
cheat = read("CHEATSHEET.md")
worked = read("WORKED_EXAMPLES.md")

# Order: visual guide → solved bank → sample-exam solutions → reference → worked examples.
brk = "\n\n<div class='pagebreak'></div>\n\n"
combined_md = visual + brk + solved + brk + examsol + brk + cheat + brk + worked

html_body = markdown.markdown(
    combined_md,
    extensions=["tables", "fenced_code", "sane_lists", "toc"],
)

CSS = """
@page { size: Letter; margin: 11mm 10mm; 
        @bottom-right { content: "p. " counter(page) " / " counter(pages); font-size:7pt; color:#888; }
        @bottom-left  { content: "ENGR&204 Final Cheat Sheet — Ranvir Thind"; font-size:7pt; color:#888; } }
* { box-sizing: border-box; }
body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 9.2pt; line-height: 1.28;
       color: #111; margin: 0; }
h1 { font-size: 15pt; color: #0b5; border-bottom: 2px solid #0b5; padding-bottom: 2px;
     margin: 12px 0 6px; page-break-after: avoid; }
h2 { font-size: 12pt; color: #06c; margin: 9px 0 3px; border-bottom: 1px solid #cdd;
     page-break-after: avoid; }
h3 { font-size: 10pt; color: #333; margin: 7px 0 2px; page-break-after: avoid; }
p { margin: 3px 0; }
ul, ol { margin: 3px 0 3px 0; padding-left: 18px; }
li { margin: 1px 0; }
code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.4pt; background: #f3f4f6;
       padding: 0 2px; border-radius: 2px; }
pre { background: #f3f4f6; border: 1px solid #dde; border-radius: 4px; padding: 5px 7px;
      margin: 4px 0; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: none; font-size: 8.3pt; line-height: 1.25; }
table { border-collapse: collapse; width: 100%; margin: 4px 0; font-size: 8.4pt;
        page-break-inside: avoid; }
th, td { border: 1px solid #bbb; padding: 2px 5px; text-align: left; vertical-align: top; }
th { background: #eef3f8; }
blockquote { background: #fffbe6; border-left: 3px solid #f5c518; margin: 5px 0; padding: 4px 9px;
             font-size: 8.7pt; page-break-inside: avoid; }
strong { color: #000; }
hr { border: none; border-top: 1px solid #ccc; margin: 6px 0; }
img { max-width: 100%; vertical-align: middle; }
h2 + p img, h2 ~ p > img { background: #fff; }
.pagebreak { page-break-before: always; }
"""

full = f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{html_body}</body></html>"

out_pdf = os.path.join(HERE, "ENGR204_Final_CheatSheet.pdf")
HTML(string=full, base_url=HERE).write_pdf(out_pdf)
print("wrote", out_pdf, os.path.getsize(out_pdf), "bytes")
