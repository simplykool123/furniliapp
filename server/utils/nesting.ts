// nesting.ts
export type Panel = {
  id: string;
  w: number; // mm
  h: number; // mm
  qty: number;
  allowRotate?: boolean; // default true if not set
  grain?: "long" | "short" | "none"; // optional; if set, we restrict rotation
};

export type Placement = {
  id: string; x: number; y: number; w: number; h: number; rotated: boolean;
};

type Rect = { x: number; y: number; w: number; h: number };
type Candidate = {
  sheetIdx: number; rectIdx: number; rotated: boolean;
  scoreSS: number; scoreLS: number; // short/long side leftovers
  placeX: number; placeY: number; w: number; h: number;
};

export type NestingOptions = {
  sheetW: number; sheetH: number;
  kerf: number; marginX: number; marginY: number;
  sort?: "area-desc" | "max-side-desc"; // panel ordering
};

export type SheetResult = {
  placements: Placement[];
  freeRects: Rect[];
  usedArea: number;
  utilization?: number;
  waste?: number;
};

// 🎯 TILING FUNCTION: Split oversized panels into tileable pieces
function tileOversizedPanels(panels: Panel[], sheetW: number, sheetH: number): Panel[] {
  const tiledPanels: Panel[] = [];
  
  panels.forEach(panel => {
    // Check if panel needs tiling (exceeds sheet dimensions)
    const needsTilingW = panel.w > sheetW;
    const needsTilingH = panel.h > sheetH;
    
    if (!needsTilingW && !needsTilingH) {
      // Panel fits, add as-is
      tiledPanels.push(panel);
    } else {
      // Panel needs tiling - split into smaller pieces
      console.log(`🔧 TILING: ${panel.id} (${panel.w}×${panel.h}) → split for better nesting`);
      
      // Calculate optimal tile dimensions
      const tilesW = Math.ceil(panel.w / sheetW);
      const tilesH = Math.ceil(panel.h / sheetH);
      
      console.log(`→ Tiling into ${tilesW}×${tilesH} pieces for nesting optimization`);
      
      // Create tiled pieces
      for (let i = 0; i < tilesW; i++) {
        for (let j = 0; j < tilesH; j++) {
          const remainingW = panel.w - (i * sheetW);
          const remainingH = panel.h - (j * sheetH);
          
          const tileW = Math.min(sheetW, remainingW);
          const tileH = Math.min(sheetH, remainingH);
          
          tiledPanels.push({
            id: `${panel.id}-tile${i + 1}x${j + 1}`,
            w: tileW,
            h: tileH,
            qty: panel.qty, // Keep original qty - will be expanded later
            allowRotate: panel.allowRotate,
            grain: panel.grain
          });
        }
      }
    }
  });
  
  return tiledPanels;
}

export function nestPanels(panelsIn: Panel[], opt: NestingOptions) {
  // 🎯 STEP 1: Apply tiling to oversized panels first
  const tiledPanels = tileOversizedPanels(panelsIn, opt.sheetW - 2 * opt.marginX, opt.sheetH - 2 * opt.marginY);
  
  // explode quantities and sort
  const panels: (Panel & { _area: number })[] = [];
  for (const p of tiledPanels) {
    for (let i = 0; i < p.qty; i++) panels.push({ ...p, _area: p.w * p.h });
  }
  panels.sort((a,b) => {
    if (opt.sort === "max-side-desc") {
      return Math.max(b.w,b.h) - Math.max(a.w,a.h);
    }
    return b._area - a._area; // default area-desc
  });

  const sheets: SheetResult[] = [];

  const newSheet = (): SheetResult => {
    const fr: Rect = {
      x: opt.marginX,
      y: opt.marginY,
      w: opt.sheetW - 2 * opt.marginX,
      h: opt.sheetH - 2 * opt.marginY,
    };
    return { placements: [], freeRects: [fr], usedArea: 0 };
  };

  const canRotate = (p: Panel) => {
    if (p.allowRotate === false) return false;
    if (!p.grain || p.grain === "none") return true;
    // simple rule: keep the long side along the same axis if grain matters
    const longIsW = p.w >= p.h;
    return false; // disable rotation when grain specified for simplicity
    // (If you need grain-aware rotation, encode desired axis and check here.)
  };

  const fits = (rw: number, rh: number, fr: Rect) => rw <= fr.w && rh <= fr.h;

  const scoreFit = (rw: number, rh: number, fr: Rect): [number, number] => {
    const ss = Math.min(fr.w - rw, fr.h - rh); // short side leftover
    const ls = Math.max(fr.w - rw, fr.h - rh); // long side leftover
    return [ss, ls];
  };

  const pruneFreeRects = (frs: Rect[]) => {
    // remove contained rects
    for (let i = 0; i < frs.length; i++) {
      for (let j = i + 1; j < frs.length; j++) {
        const A = frs[i], B = frs[j];
        if (contains(A,B)) { frs.splice(j,1); j--; continue; }
        if (contains(B,A)) { frs.splice(i,1); i--; break; }
      }
    }
  };

  const contains = (a: Rect, b: Rect) =>
    b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;

  const splitFreeRect = (frs: Rect[], idx: number, placed: Rect, kerf: number) => {
    const fr = frs[idx];
    // remove used free rect
    frs.splice(idx, 1);

    const rightW = fr.x + fr.w - (placed.x + placed.w) - kerf;
    if (rightW > 0) {
      frs.push({
        x: placed.x + placed.w + kerf,
        y: fr.y,
        w: rightW,
        h: fr.h,
      });
    }
    const bottomH = fr.y + fr.h - (placed.y + placed.h) - kerf;
    if (bottomH > 0) {
      frs.push({
        x: fr.x,
        y: placed.y + placed.h + kerf,
        w: fr.w,
        h: bottomH,
      });
    }

    // left strip
    const leftW = placed.x - fr.x - kerf;
    if (leftW > 0) {
      frs.push({ x: fr.x, y: fr.y, w: leftW, h: fr.h });
    }

    // top strip
    const topH = placed.y - fr.y - kerf;
    if (topH > 0) {
      frs.push({ x: fr.x, y: fr.y, w: fr.w, h: topH });
    }

    // prune overlaps (guillotine-style keeps it simple)
    // Remove any rects overlapping 'placed'
    for (let i = 0; i < frs.length; i++) {
      const r = frs[i];
      const overlap =
        !(r.x + r.w <= placed.x ||
          placed.x + placed.w <= r.x ||
          r.y + r.h <= placed.y ||
          placed.y + placed.h <= r.y);
      if (overlap) { frs.splice(i,1); i--; }
    }

    pruneFreeRects(frs);
  };

  // main loop
  for (const part of panels) {
    let placed = false;

    // try to place on existing sheets
    let best: Candidate | null = null;

    const tryOrient = (w0: number, h0: number, sheetIdx: number) => {
      const sheet = sheets[sheetIdx];
      sheet.freeRects.forEach((fr, rectIdx) => {
        if (!fits(w0, h0, fr)) return;
        const [ss, ls] = scoreFit(w0, h0, fr);
        const cand: Candidate = {
          sheetIdx, rectIdx, rotated: w0 !== part.w,
          scoreSS: ss, scoreLS: ls,
          placeX: fr.x, placeY: fr.y, w: w0, h: h0
        };
        if (
          !best ||
          cand.scoreSS < best.scoreSS ||
          (cand.scoreSS === best.scoreSS && cand.scoreLS < best.scoreLS)
        ) best = cand;
      });
    };

    for (let s = 0; s < sheets.length; s++) {
      // try normal
      tryOrient(part.w, part.h, s);
      // try rotated
      if (canRotate(part)) tryOrient(part.h, part.w, s);
    }

    // if no candidate, open a new sheet
    if (!best) {
      sheets.push(newSheet());
      const s = sheets.length - 1;
      // re-run fit against the new sheet
      tryOrient(part.w, part.h, s);
      if (canRotate(part)) tryOrient(part.h, part.w, s);
      if (!best) {
        // even the new sheet can't fit -> input too big
        throw new Error(`Panel ${part.id} (${part.w}×${part.h}) doesn't fit on a fresh sheet`);
      }
    }

    // commit placement
    if (!best) {
      throw new Error(`Failed to place panel ${part.id} (${part.w}×${part.h})`);
    }
    
    const sheet = sheets[best.sheetIdx];
    const placedRect: Rect = { x: best.placeX, y: best.placeY, w: best.w, h: best.h };
    sheet.placements.push({
      id: part.id, x: placedRect.x, y: placedRect.y,
      w: best.rotated ? part.h : part.w,
      h: best.rotated ? part.w : part.h,
      rotated: best.rotated
    });
    sheet.usedArea += (part.w * part.h);

    // split free space (adds kerf gaps)
    splitFreeRect(sheet.freeRects, best.rectIdx, placedRect, opt.kerf);
    placed = true;

    if (!placed) throw new Error("Internal: unplaced part");
  }

  // compute utilization per sheet
  const sheetNetArea =
    (opt.sheetW - 2 * opt.marginX) * (opt.sheetH - 2 * opt.marginY);

  const results = sheets.map(s => ({
    ...s,
    utilization: Math.min(1.0, s.usedArea / sheetNetArea), // Cap at 100%
    waste: Math.max(0, 1 - (s.usedArea / sheetNetArea)),    // Prevent negative waste
  }));

  return { sheets: results, sheetNetArea };
}