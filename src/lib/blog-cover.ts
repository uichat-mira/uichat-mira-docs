import type { Doc } from "../content/folio-adapter";

const appBase = import.meta.env.BASE_URL;
const randomModulus = 2_147_483_647;
const accentColors = ["#cc785c", "#5db8a6", "#e8a55a", "#6b8fb0"] as const;

type RandomSource = () => number;

function hashSeed(value: string) {
  let hash = 17;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % randomModulus;
  }
  return hash || 1;
}

function createDeterministicRandom(seed: string): RandomSource {
  let state = hashSeed(seed);
  return () => {
    state = (state * 48_271) % randomModulus;
    return state / randomModulus;
  };
}

function randomBetween(rand: RandomSource, min: number, max: number) {
  return min + rand() * (max - min);
}

function randomDirection(rand: RandomSource) {
  return rand() > 0.5 ? "normal" : "reverse";
}

function createRing(
  rand: RandomSource,
  width: number,
  height: number,
  rxRange: readonly [number, number],
  ryRange: readonly [number, number],
) {
  return {
    rx: randomBetween(rand, width * rxRange[0], width * rxRange[1]),
    ry: randomBetween(rand, height * ryRange[0], height * ryRange[1]),
    rot: randomBetween(rand, -18, 18),
    dur: Math.round(randomBetween(rand, 40, 70)),
    dir: randomDirection(rand),
  };
}

function animationName(direction: string) {
  return direction === "normal" ? "spin-n" : "spin-r";
}

function generateOrbitCoverSvg(seed: string) {
  const rand = createDeterministicRandom(seed);
  const width = 1200;
  const height = 520;
  const cx = width / 2;
  const cy = height * 0.52;
  const accent = accentColors[Math.floor(rand() * accentColors.length)];
  const neutralRing = "#d9cfbd";
  const ringA = createRing(rand, width, height, [0.32, 0.42], [0.16, 0.24]);
  const ringB = createRing(rand, width, height, [0.22, 0.3], [0.22, 0.32]);
  const badgeR = width * 0.07;
  const dotAngle = randomBetween(rand, 0, Math.PI * 2);
  const dotR = badgeR * 0.28;
  const dotX = cx + Math.cos(dotAngle) * badgeR * 0.4;
  const dotY = cy + Math.sin(dotAngle) * badgeR * 0.4;

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .ring { transform-box: fill-box; transform-origin: center; fill: none; }
    @keyframes spin-n { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes spin-r { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  </style>
  <ellipse class="ring" style="animation:${animationName(ringA.dir)} ${ringA.dur}s linear infinite" cx="${cx}" cy="${cy}" rx="${ringA.rx.toFixed(1)}" ry="${ringA.ry.toFixed(1)}" stroke="${neutralRing}" stroke-width="1.2" transform="rotate(${ringA.rot.toFixed(1)} ${cx} ${cy})"/>
  <ellipse class="ring" style="animation:${animationName(ringB.dir)} ${ringB.dur}s linear infinite" cx="${cx}" cy="${cy}" rx="${ringB.rx.toFixed(1)}" ry="${ringB.ry.toFixed(1)}" stroke="${accent}" stroke-width="1.6" transform="rotate(${ringB.rot.toFixed(1)} ${cx} ${cy})"/>
  <circle cx="${cx}" cy="${cy}" r="${badgeR.toFixed(1)}" fill="none" stroke="${accent}" stroke-width="1.8"/>
  <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="${dotR.toFixed(1)}" fill="${accent}"/>
</svg>`;
}

export function resolveCoverSource(doc: Doc) {
  const cover = doc.cover?.trim();
  if (cover) {
    if (/^https?:\/\//i.test(cover) || /^data:image\//i.test(cover)) return cover;
    if (cover.startsWith("/")) return `${appBase}${cover.replace(/^\/+/, "")}`;
    return cover;
  }

  const fallbackSvg = generateOrbitCoverSvg(doc.path || doc.title);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
}
