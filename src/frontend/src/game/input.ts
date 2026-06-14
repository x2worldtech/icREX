// Keyboard handling, kept separate from the engine so input sources are
// pluggable. Pointer / touch are wired directly to engine methods by the React
// layer (so on-screen buttons and canvas taps share the same code path).

export interface InputHandlers {
  onJumpPress: () => void;
  onJumpRelease: () => void;
  onDuckPress: () => void;
  onDuckRelease: () => void;
  onPause: () => void;
  onConfirm: () => void;
}

const JUMP_KEYS = new Set(["Space", "ArrowUp", "KeyW"]);
const DUCK_KEYS = new Set(["ArrowDown", "KeyS"]);

export class KeyboardInput {
  private handlers: InputHandlers;
  private down = new Set<string>();

  constructor(handlers: InputHandlers) {
    this.handlers = handlers;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (JUMP_KEYS.has(e.code)) {
      e.preventDefault();
      if (!this.down.has(e.code)) {
        this.down.add(e.code);
        this.handlers.onJumpPress();
      }
      return;
    }
    if (DUCK_KEYS.has(e.code)) {
      e.preventDefault();
      if (!this.down.has(e.code)) {
        this.down.add(e.code);
        this.handlers.onDuckPress();
      }
      return;
    }
    if (e.code === "Escape" || e.code === "KeyP") {
      this.handlers.onPause();
      return;
    }
    if (e.code === "Enter") {
      this.handlers.onConfirm();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (JUMP_KEYS.has(e.code)) {
      this.down.delete(e.code);
      this.handlers.onJumpRelease();
    } else if (DUCK_KEYS.has(e.code)) {
      this.down.delete(e.code);
      this.handlers.onDuckRelease();
    }
  };

  attach(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  detach(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.down.clear();
  }
}
