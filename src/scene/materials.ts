import * as THREE from "three";

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, rand: () => number) => void, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không tạo được canvas cho vật liệu.");
  draw(ctx, mulberry32(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function marbleTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, rand) => {
    ctx.fillStyle = "#f7f4ef";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#e3ddd4";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 504);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(150, 148, 144, ${0.18 + rand() * 0.28})`;
      ctx.lineWidth = 1 + rand() * 1.6;
      let x = rand() * 512;
      let y = rand() * 512;
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (rand() - 0.5) * 160;
        y += (rand() - 0.35) * 130;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 11);
}

function woodTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 170, (ctx, rand) => {
    ctx.fillStyle = "#c4b6a6";
    ctx.fillRect(0, 0, 512, 170);
    const drawPlank = (y: number, seam: number) => {
      ctx.fillStyle = "#b7a898";
      ctx.fillRect(0, y, 512, 84);
      ctx.strokeStyle = "rgba(120, 104, 90, 0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const gy = y + 10 + i * 14 + rand() * 4;
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(120, gy + (rand() - 0.5) * 8, 280, gy + (rand() - 0.5) * 10, 512, gy + (rand() - 0.5) * 6);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(90, 78, 68, 0.28)";
      ctx.fillRect(seam, y, 3, 84);
    };
    drawPlank(0, 250);
    drawPlank(86, 80);
    ctx.fillStyle = "#a89888";
    ctx.fillRect(0, 82, 512, 4);
  }, 27);
}

function slateTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, rand) => {
    ctx.fillStyle = "#6a7178";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.05})`;
      ctx.fillRect(rand() * 256, rand() * 256, 8 + rand() * 30, 2 + rand() * 4);
    }
    ctx.strokeStyle = "#2a2e32";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 250);
  }, 41);
}

function walnutTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, rand) => {
    ctx.fillStyle = "#5b3a29";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(40, 22, 14, 0.35)";
    for (let x = 8; x < 256; x += 18) {
      ctx.beginPath();
      ctx.lineWidth = 2 + rand() * 3;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 8, 80, x - 10, 160, x + 4, 256);
      ctx.stroke();
    }
  }, 53);
}

function herringboneTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#7a4e36";
    ctx.fillRect(0, 0, 256, 256);
    const size = 32;
    for (let y = -size; y < 256 + size; y += size) {
      for (let x = -size; x < 256 + size; x += size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = ((x + y) / size) % 2 === 0 ? "#8d5c40" : "#5c3b2a";
        ctx.fillRect(-2, -size * 0.35, size * 1.1, size * 0.32);
        ctx.restore();
      }
    }
  }, 67);
}

function entryDoorTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = "#e6d3b0";
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = "#5e564e";
    ctx.fillRect(78, 0, 34, 256);
    ctx.fillStyle = "rgba(90, 60, 30, 0.15)";
    for (let y = 0; y < 256; y += 9) ctx.fillRect(0, y, 78, 1);
  }, 71);
}

function standard(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(params);
}

const cache = new Map<string, THREE.Material>();

export function getMaterial(id: string): THREE.Material {
  const existing = cache.get(id);
  if (existing) return existing;
  const material = createMaterial(id);
  cache.set(id, material);
  return material;
}

function createMaterial(id: string): THREE.Material {
  switch (id) {
    case "wall":
      return standard({ color: "#f4efe6", roughness: 0.92, metalness: 0 });
    case "baseboard":
      return standard({ color: "#8b7768", roughness: 0.72, metalness: 0 });
    case "ceiling":
      return standard({ color: "#f7f7f5", roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    case "walnut":
      return standard({ map: walnutTexture(), color: "#ffffff", roughness: 0.62, metalness: 0 });
    case "herringbone":
      return standard({ map: herringboneTexture(), color: "#ffffff", roughness: 0.58, metalness: 0 });
    case "cream":
      return standard({ color: "#f3efe4", roughness: 0.18, metalness: 0.04 });
    case "granite":
      return standard({ color: "#171717", roughness: 0.28, metalness: 0.18 });
    case "lime":
      return standard({ color: "#a8d400", emissive: "#b6e000", emissiveIntensity: 0.45, roughness: 0.16, metalness: 0.02 });
    case "steel":
      return standard({ color: "#d5d8dc", roughness: 0.28, metalness: 0.62 });
    case "steelDark":
      return standard({ color: "#9aa0a6", roughness: 0.35, metalness: 0.5 });
    case "cooktop":
      return standard({ color: "#101010", roughness: 0.18, metalness: 0.4 });
    case "oak":
      return standard({ color: "#e0c29a", roughness: 0.55, metalness: 0 });
    case "entryDoor":
      return standard({ map: entryDoorTexture(), color: "#ffffff", roughness: 0.5, metalness: 0 });
    case "aluminum":
      return standard({ color: "#1a1a1a", roughness: 0.38, metalness: 0.55 });
    case "glass":
      return standard({ color: "#c5e6f6", roughness: 0.05, metalness: 0.04, transparent: true, opacity: 0.32, depthWrite: false });
    case "railingGlass":
      return standard({ color: "#d5e6ee", roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.38, depthWrite: false });
    case "cabinetGlass":
      return standard({ color: "#243028", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.45, depthWrite: false });
    case "curtain":
      return standard({ color: "#b8a58f", roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
    case "sheer":
      return standard({ color: "#ffffff", roughness: 0.4, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
    case "tie":
      return standard({ color: "#8f7d68", roughness: 0.8, metalness: 0 });
    case "lamp":
      return standard({ color: "#fff4d2", emissive: "#ffe3a3", emissiveIntensity: 1.6, roughness: 0.4 });
    case "robot":
      return standard({ color: "#f6f1e8", roughness: 0.55, metalness: 0.04 });
    case "robotAccent":
      return standard({ color: "#e07a3d", roughness: 0.45, metalness: 0.05 });
    case "robotDark":
      return standard({ color: "#2c2824", roughness: 0.4, metalness: 0.1 });
    case "shadow":
      return new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22, depthWrite: false });
    default:
      console.warn(`[Glory Heights] Không có vật liệu "${id}", dùng màu trung tính.`);
      return standard({ color: "#c8c2b8", roughness: 0.7 });
  }
}

const floorCache = new Map<string, THREE.MeshStandardMaterial>();

export function getFloorMaterial(id: string): THREE.MeshStandardMaterial {
  const existing = floorCache.get(id);
  if (existing) return existing;
  let material: THREE.MeshStandardMaterial;
  if (id === "marble_white") {
    material = standard({ map: marbleTexture(), color: "#ffffff", roughness: 0.15, metalness: 0.02 });
  } else if (id === "wood_laminate") {
    material = standard({ map: woodTexture(), color: "#ffffff", roughness: 0.5, metalness: 0 });
  } else if (id === "slate_dark") {
    material = standard({ map: slateTexture(), color: "#ffffff", roughness: 0.62, metalness: 0.04 });
  } else {
    console.warn(`[Glory Heights] Sàn "${id}" chưa có mẫu. Dùng màu xám.`);
    material = standard({ color: "#b7b1a8", roughness: 0.6 });
  }
  floorCache.set(id, material);
  return material;
}

export const FLOOR_TILE: Record<string, { u: number; v: number }> = {
  marble_white: { u: 0.8, v: 0.8 },
  wood_laminate: { u: 1.2, v: 0.4 },
  slate_dark: { u: 0.45, v: 0.45 },
};
