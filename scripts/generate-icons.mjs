/**
 * Generate PWA app icons as SVG → PNG using sharp or canvas.
 * Falls back to creating SVG files if no image library is available.
 */
import fs from "fs";
import path from "path";

const sizes = [192, 512];
const outDir = path.join(process.cwd(), "public", "icons");

function generateSVG(size) {
  const fontSize = Math.round(size * 0.28);
  const smallFontSize = Math.round(size * 0.22);
  const padding = Math.round(size * 0.1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#1c1917"/>
  <text x="${size/2}" y="${size * 0.45}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#fafaf9">stonk</text>
  <text x="${size/2}" y="${size * 0.72}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${smallFontSize}" fill="#0284c7">BRO</text>
  <rect x="${padding}" y="${size * 0.82}" width="${size - padding * 2}" height="${Math.round(size * 0.04)}" rx="${Math.round(size * 0.02)}" fill="#0284c7" opacity="0.6"/>
</svg>`;
}

// Try to use sharp for PNG generation
async function main() {
  for (const size of sizes) {
    const svg = generateSVG(size);
    const svgPath = path.join(outDir, `icon-${size}.svg`);
    fs.writeFileSync(svgPath, svg);

    try {
      const sharp = (await import("sharp")).default;
      const pngPath = path.join(outDir, `icon-${size}.png`);
      await sharp(Buffer.from(svg)).png().toFile(pngPath);
      fs.unlinkSync(svgPath); // Remove SVG if PNG was generated
      console.log(`Generated ${pngPath}`);
    } catch {
      // sharp not available — rename SVG to be used directly
      console.log(`Generated ${svgPath} (install sharp for PNG)`);
    }
  }

  // Also create apple-touch-icon
  const appleSvg = generateSVG(180);
  const applePath = path.join(process.cwd(), "public", "apple-touch-icon.svg");
  fs.writeFileSync(applePath, appleSvg);

  try {
    const sharp = (await import("sharp")).default;
    const applePng = path.join(process.cwd(), "public", "apple-touch-icon.png");
    await sharp(Buffer.from(appleSvg)).png().toFile(applePng);
    fs.unlinkSync(applePath);
    console.log(`Generated ${applePng}`);
  } catch {
    console.log(`Generated ${applePath}`);
  }
}

main();
