#!/usr/bin/env python3
"""
Extrai produtos e imagens do arquivo Peças Atacado Ecoferro - 01-2026.ods.

Saída:
  scripts/extracted/products.json   — array com produtos prontos para upload.
  scripts/extracted/images/<code>/  — pasta com as imagens daquele produto.

Uso:
  python scripts/extract-wholesale-spreadsheet.py "C:\\path\\Peças Atacado Ecoferro - 01-2026 (1).ods"

Dependências:
  pip install pyexcel-ods3
"""
import json
import os
import re
import shutil
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

try:
    from pyexcel_ods3 import get_data
except ImportError:
    print("Falta dependência: pip install pyexcel-ods3", file=sys.stderr)
    sys.exit(1)


def slugify(text: str) -> str:
    text = re.sub(r"[áàâãä]", "a", text, flags=re.IGNORECASE)
    text = re.sub(r"[éèêë]", "e", text, flags=re.IGNORECASE)
    text = re.sub(r"[íìîï]", "i", text, flags=re.IGNORECASE)
    text = re.sub(r"[óòôõö]", "o", text, flags=re.IGNORECASE)
    text = re.sub(r"[úùûü]", "u", text, flags=re.IGNORECASE)
    text = re.sub(r"ç", "c", text, flags=re.IGNORECASE)
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def parse_image_anchors(ods_path: Path) -> dict[int, list[str]]:
    """Mapeia (linha 0-based) -> lista de hrefs de imagens ancoradas naquela linha."""
    NS = {
        "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
        "draw":  "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
        "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
        "xlink": "http://www.w3.org/1999/xlink",
    }
    row_to_imgs: dict[int, list[str]] = {}
    with zipfile.ZipFile(ods_path) as z:
        with z.open("content.xml") as f:
            tree = ET.parse(f)
    root = tree.getroot()

    # Walk every table and track the row index manually
    for table in root.iter(f"{{{NS['table']}}}table"):
        row_idx = 0
        for child in list(table):
            tag = child.tag.split("}", 1)[-1]
            if tag != "table-row":
                continue
            repeat = int(child.attrib.get(f"{{{NS['table']}}}number-rows-repeated", "1"))
            # find all image hrefs inside this row's frames
            for frame in child.iter(f"{{{NS['draw']}}}frame"):
                # row anchor — by default frame is anchored at the cell that contains it
                # find the row index attribute on the cell, but normally frames are inside cells
                pass
            # a cleaner pass: for each cell, collect frames inside it
            for cell in child.findall(f"{{{NS['table']}}}table-cell"):
                hrefs = []
                for frame in cell.iter(f"{{{NS['draw']}}}frame"):
                    for image in frame.iter(f"{{{NS['draw']}}}image"):
                        href = image.attrib.get(f"{{{NS['xlink']}}}href")
                        if href:
                            hrefs.append(href)
                if hrefs:
                    row_to_imgs.setdefault(row_idx, []).extend(hrefs)
            row_idx += repeat
    return row_to_imgs


def extract_image_bytes(ods_path: Path, hrefs: list[str], out_dir: Path) -> list[str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved: list[str] = []
    with zipfile.ZipFile(ods_path) as z:
        names = z.namelist()
        for href in hrefs:
            zip_path = href.lstrip("./")
            if zip_path not in names:
                # fallback by basename
                basename = os.path.basename(zip_path)
                matches = [n for n in names if n.endswith(basename)]
                if not matches:
                    continue
                zip_path = matches[0]
            data = z.read(zip_path)
            ext = Path(zip_path).suffix or ".png"
            filename = f"{Path(zip_path).stem[:24]}{ext}"
            target = out_dir / filename
            with open(target, "wb") as fp:
                fp.write(data)
            saved.append(str(target.name))
    return saved


def num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    ods_path = Path(sys.argv[1])
    if not ods_path.exists():
        print(f"Arquivo nao encontrado: {ods_path}", file=sys.stderr)
        return 1

    project_root = Path(__file__).resolve().parents[1]
    out_root = project_root / "scripts" / "extracted"
    if out_root.exists():
        shutil.rmtree(out_root)
    out_root.mkdir(parents=True, exist_ok=True)
    images_root = out_root / "images"
    images_root.mkdir(parents=True, exist_ok=True)

    rows = list(get_data(str(ods_path)).values())[0]
    anchors = parse_image_anchors(ods_path)

    products: list[dict[str, Any]] = []
    current_brand = None
    for idx, row in enumerate(rows):
        if not row:
            continue
        # Brand header rows look like ['', 'HONDA']
        if len(row) == 2 and (row[0] == "" or row[0] is None) and isinstance(row[1], str) and row[1].strip():
            brand_name = row[1].strip()
            current_brand = brand_name
            continue

        code = str(row[0]).strip() if row and row[0] else ""
        if not code or code.lower() in ("cod.", "codigo", "código"):
            continue
        # skip if row[1] (description) is not a string
        if len(row) < 2 or not isinstance(row[1], str):
            continue
        description = row[1].strip()
        if not description:
            continue

        unit_price = num(row[3]) if len(row) > 3 else None
        ncm = ""
        if len(row) > 9 and row[9]:
            ncm_full = str(row[9]).strip()
            m = re.match(r"^(\d{4,8})", ncm_full)
            ncm = m.group(1) if m else ncm_full
        weight = num(row[7]) if len(row) > 7 else None
        measures = str(row[6]).strip() if len(row) > 6 and row[6] else ""

        # extract images for this row
        hrefs = anchors.get(idx, [])
        if hrefs:
            target_dir = images_root / slugify(code)
            saved = extract_image_bytes(ods_path, hrefs, target_dir)
        else:
            saved = []

        product = {
            "internal_code": code,
            "name": description.split(" - ")[0].strip()[:140] or description[:140],
            "long_description": description,
            "brand": current_brand,
            "wholesale_price": unit_price,
            "weight_kg": weight,
            "measures": measures,
            "ncm": ncm,
            "row_index": idx,
            "image_files": saved,
        }
        products.append(product)

    out_root.mkdir(parents=True, exist_ok=True)
    products_path = out_root / "products.json"
    with open(products_path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    total_images = sum(len(p["image_files"]) for p in products)
    print(f"Extraídos {len(products)} produtos | {total_images} imagens em {out_root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
