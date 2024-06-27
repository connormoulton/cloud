import { createCanvas } from "https://deno.land/x/canvas/mod.ts";

export async function generateThumbnail(text: string) {
  const width = 1000;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Get the text argument from the command line
  const text = Deno.args[0] || "Hello";

  // Fill the canvas with a color
  ctx.fillStyle = "rgba(0, 0, 0, 0)"; // White background
  ctx.fillRect(0, 0, width, height);

  // Set text properties
  ctx.fillStyle = "#000000"; // Black text
  ctx.font = "200px monospace";

  // Function to split text into lines that fit the canvas width
  function wrapText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = context.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  // Wrap text to fit the canvas width
  const lines = wrapText(ctx, text, width - 10); // 10 pixels padding

  // Calculate the starting y position to center the text vertically
  const lineHeight = 200;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + lineHeight;

  // Draw each line of text on the canvas
  lines.forEach((line, index) => {
    const textMetrics = ctx.measureText(line);
    const textX = (width - textMetrics.width) / 2;
    const textY = startY + index * lineHeight;
    ctx.fillText(line, textX, textY);
  });

  // Save the canvas to a file
  const buffer = canvas.toBuffer("image/png");
  await Deno.writeFile(`images/thumb-${text}.png`, buffer);

  console.log(`Generated 100x100 pixel PNG image with text: "${text}"`);
}
