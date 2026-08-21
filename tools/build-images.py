#!/usr/bin/env python3
"""Генерация адаптивных вариантов картинок (AVIF + WebP) в images/opt/.

Запуск:  python3 tools/build-images.py [--force]
Требует Pillow с поддержкой webp и avif (pip install "pillow>=11.3").
Исходники в images/ не трогаются — они остаются fallback'ом в <img src>.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images"
OUT = SRC / "opt"

# базовое имя (без расширения) -> ширины, которые реально нужны вёрстке
SETS = {
    "hero":     [768, 1200, 1600, 2200],
    "cta":      [768, 1280, 2000],
    "photo1":   [560, 900, 1300, 1600],
    "photo2":   [560, 900, 1300, 1600],
    "logo":     [44, 88, 132],
}
for name in ("norway", "iceland", "italy", "portugal", "swiss", "scotland"):
    SETS[f"dest-{name}"] = [480, 768, 1100, 1400]
for i in range(1, 7):
    SETS[f"tour-{i}"] = [400, 640, 900, 1200]
for i in range(1, 9):
    # gal-1/4/6 сняты уже 1300px — вверх не растягиваем
    SETS[f"gal-{i}"] = [400, 700, 1000, 1300 if i in (1, 4, 6) else 1400]

WEBP = dict(quality=78, method=6)
AVIF = dict(quality=58, speed=4)

force = "--force" in sys.argv


def source_for(base: str) -> Path:
    for ext in (".jpg", ".png"):
        p = SRC / f"{base}{ext}"
        if p.exists():
            return p
    raise SystemExit(f"нет исходника для {base}")


def save(img: Image.Image, path: Path, src_mtime: float) -> bool:
    if not force and path.exists() and path.stat().st_mtime >= src_mtime:
        return False
    if path.suffix == ".webp":
        img.save(path, "WEBP", **WEBP)
    elif path.suffix == ".avif":
        img.save(path, "AVIF", **AVIF)
    else:
        img.save(path, optimize=True)
    return True


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    written = skipped = 0
    for base, widths in sorted(SETS.items()):
        src = source_for(base)
        mtime = src.stat().st_mtime
        with Image.open(src) as im:
            has_alpha = im.mode in ("RGBA", "LA", "P") and "transparency" in im.info or im.mode in ("RGBA", "LA")
            im = im.convert("RGBA" if has_alpha else "RGB")
            for w in widths:
                if w > im.width:
                    print(f"!! {base}: {w}px больше исходника ({im.width}px) — пропущено")
                    continue
                h = round(im.height * w / im.width)
                resized = im.resize((w, h), Image.LANCZOS)
                targets = [OUT / f"{base}-{w}.avif", OUT / f"{base}-{w}.webp"]
                if src.suffix == ".png":          # для логотипа нужен и лёгкий png-fallback
                    targets.append(OUT / f"{base}-{w}.png")
                for t in targets:
                    if save(resized, t, mtime):
                        written += 1
                    else:
                        skipped += 1
    total = sum(f.stat().st_size for f in OUT.iterdir() if f.is_file())
    print(f"готово: записано {written}, пропущено {skipped}, всего {total/1024/1024:.1f} МБ в {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
