// smartDefaults.ts - Industry-standard wardrobe configuration defaults
export type WardrobeType = "OPENABLE" | "SLIDING" | "WALKIN";

export type SmartDefaultsInput = {
  unit: "mm" | "ft";
  width: number;  // as entered
  height: number; // as entered
  depth: number;  // as entered
  type: WardrobeType;
};

export type SmartDefaults = {
  columns: number;
  shutters: number;
  hingesPerShutter: number;   // 0 for sliding/walk-in
  straightenerPerShutter: boolean;
  drawers: number;
  shelves: number;
  rods: number;
  foldableShelf: boolean;
  notes: string[];
};

const FT_TO_MM = 304.8;

const STD = {
  moduleW_openable: 600,     // mm - industry standard module width
  slidingMinShutter: 750,    // mm - minimum sliding shutter width
  slidingMaxShutter: 950,    // mm - maximum sliding shutter width
  minDepthForRod: 550,       // mm - minimum depth for hanging rods
  doubleHangMinHeight: 2100, // mm (~7 ft) - minimum height for double hanging
};

function toMM(n: number, unit: "mm"|"ft") {
  return unit === "ft" ? n * FT_TO_MM : n;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hingesFor(heightMM: number) {
  if (heightMM <= 900) return 2;
  if (heightMM <= 1500) return 3;
  if (heightMM <= 2100) return 4;
  return 4; // >2100 we'll add straightener
}

export function suggestDefaults(input: SmartDefaultsInput): SmartDefaults {
  const W = toMM(input.width, input.unit);
  const H = toMM(input.height, input.unit);
  const D = toMM(input.depth, input.unit);

  const notes: string[] = [];
  let columns = 1;
  let shutters = 0;
  let hingesPerShutter = 0;
  let straightenerPerShutter = false;

  // Columns & shutters logic
  if (input.type === "OPENABLE") {
    columns = Math.max(1, Math.round(W / STD.moduleW_openable));
    shutters = columns; // one per module (~600 mm)
    hingesPerShutter = hingesFor(H);
    if (H > 2100) {
      straightenerPerShutter = true;
      notes.push("Door height > 7ft: add straightener on each shutter.");
    }
  } else if (input.type === "SLIDING") {
    columns = Math.max(1, Math.round(W / STD.moduleW_openable)); // internal modules can still be ~600
    shutters = (W <= 1800 ? 2 : 3);
    const approxShutterW = W / shutters;
    if (approxShutterW < STD.slidingMinShutter || approxShutterW > STD.slidingMaxShutter) {
      notes.push(`Sliding shutter width ≈ ${Math.round(approxShutterW)}mm (target ${STD.slidingMinShutter}-${STD.slidingMaxShutter}mm).`);
    }
  } else { // WALKIN
    columns = Math.max(1, Math.round(W / STD.moduleW_openable));
    shutters = 0;
  }

  // Hanging rods logic
  let rods = 0;
  let foldableShelf = false;

  if (D < STD.minDepthForRod) {
    rods = 0;
    foldableShelf = true;
    notes.push("Depth < 550mm: hangers not recommended. Added 1 foldable shelf.");
  } else {
    if (H >= STD.doubleHangMinHeight) {
      rods = (columns === 1) ? 2 : 3; // double-hang + long-hang
    } else {
      rods = (columns === 1) ? 1 : 2;
    }
  }

  // Drawers (total) - scale with width
  let drawers = clamp(Math.round(W / 300), 2, 6);

  // Shelves (total) - complex logic based on rods and columns
  let shelves = 0;
  if (rods === 0) {
    // No rods = fully shelfed wardrobe
    shelves = columns * 4;
    if (!foldableShelf) foldableShelf = true; // ensure at least one
  } else {
    const hangingColumns = Math.min(columns, Math.ceil(rods / 2)); // one column can take 2 rods (double hang)
    shelves += rods; // top shelf above each hanging section
    shelves += Math.max(0, columns - hangingColumns) * 2; // extra shelves in non-hanging columns
  }

  return {
    columns,
    shutters,
    hingesPerShutter,
    straightenerPerShutter,
    drawers,
    shelves,
    rods,
    foldableShelf,
    notes,
  };
}

// Helper function to map our wardrobe types to the smart defaults types
export function mapToSmartDefaultType(wardrobeType: string): WardrobeType {
  const type = wardrobeType.toLowerCase();
  if (type === 'sliding') return "SLIDING";
  if (type === 'walkin' || type === 'walk-in') return "WALKIN";
  return "OPENABLE"; // Default
}