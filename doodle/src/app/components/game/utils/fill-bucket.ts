export class FillBucket {

  public static floodFill(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    startX: number,
    startY: number,
    fillColor: string
  ) {
    const width = canvas.width;
    const height = canvas.height;

    const fillColorRgba = this.hexToRgba(fillColor);

    // Get current pixel data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert (startX, startY) to index in `data`
    const startIndex = this.coordToIndex(Math.round(startX), Math.round(startY), width);
    if (startIndex < 0 || startIndex >= data.length) {
      return;
    }

    // Get old color from the clicked pixel
    const oldColor = [
      data[startIndex],
      data[startIndex + 1],
      data[startIndex + 2],
      data[startIndex + 3]
    ];

    // If the fill color is the same as the old color, no need to fill
    if (
      oldColor[0] === fillColorRgba[0] &&
      oldColor[1] === fillColorRgba[1] &&
      oldColor[2] === fillColorRgba[2] &&
      oldColor[3] === fillColorRgba[3]
    ) {
      return;
    }

    // BFS queue
    const queue: [number, number][] = [];
    queue.push([Math.round(startX), Math.round(startY)]);

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const currentIndex = this.coordToIndex(x, y, width);

      // Check if this pixel is within bounds and still matches oldColor
      if (this.matchesOldColor(data, currentIndex, oldColor)) {
        // Paint it with the new color
        data[currentIndex]     = fillColorRgba[0];
        data[currentIndex + 1] = fillColorRgba[1];
        data[currentIndex + 2] = fillColorRgba[2];
        data[currentIndex + 3] = fillColorRgba[3];

        // Add neighbors to the queue
        if (x > 0)           queue.push([x - 1, y]);
        if (x < width - 1)   queue.push([x + 1, y]);
        if (y > 0)           queue.push([x, y - 1]);
        if (y < height - 1)  queue.push([x, y + 1]);
      }
    }

    // Put the updated image data back on the canvas
    ctx.putImageData(imageData, 0, 0);
  }

  private static coordToIndex(x: number, y: number, width: number): number {
    return (y * width + x) * 4;
  }

  private static matchesOldColor(data: Uint8ClampedArray, index: number, oldColor: number[]): boolean {
    return (
      data[index]     === oldColor[0] &&
      data[index + 1] === oldColor[1] &&
      data[index + 2] === oldColor[2] &&
      data[index + 3] === oldColor[3]
    );
  }

  private static hexToRgba(hex: string): number[] {
    // Remove leading #
    hex = hex.replace('#', '');
    // Expand shorthand #fff => #ffffff
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    // Parse r, g, b
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r, g, b, 255];
  }
}
