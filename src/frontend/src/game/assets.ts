// Loads the sprite images used by the renderer and tracks readiness.
// Images live in /assets/generated and were produced by caffeine.

const SOURCES = {
  playerRun1:
    "/assets/generated/player-character-run1-right-transparent.dim_64x64.png",
  playerRun2:
    "/assets/generated/player-character-run2-right-transparent.dim_64x64.png",
  cactus: "/assets/generated/cactus-pixel-obstacle-transparent.dim_32x48.png",
  coin: "/assets/generated/icp-coin-transparent.dim_32x32.png",
  background: "/assets/generated/desert-background.dim_1024x400.png",
  ground: "/assets/generated/desert-ground.dim_1024x100.png",
} as const;

export type AssetKey = keyof typeof SOURCES;

export class Assets {
  private images = new Map<AssetKey, HTMLImageElement>();
  private loadedCount = 0;
  private total = 0;

  load(): void {
    const keys = Object.keys(SOURCES) as AssetKey[];
    this.total = keys.length;
    for (const key of keys) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        this.loadedCount++;
      };
      img.onerror = () => {
        this.loadedCount++;
      };
      img.src = SOURCES[key];
      this.images.set(key, img);
    }
  }

  get(key: AssetKey): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  // Returns a drawable image only when it has finished decoding.
  ready(key: AssetKey): HTMLImageElement | null {
    const img = this.images.get(key);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
  }

  get progress(): number {
    return this.total === 0 ? 1 : this.loadedCount / this.total;
  }
}
