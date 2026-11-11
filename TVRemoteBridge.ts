/**
 * TVRemoteBridge.ts
 * Real ADB / Scrcpy Input Injector
 */

export interface RemoteCommandPayload {
  action: string;
  payload?: any;
}

export interface AdbTouchInjector {
  sendTouch?: (action: number, pointerId: number, x: number, y: number, pressure?: number) => void;
  sendKeyEvent?: (action: number, keyCode: number, metaState?: number) => void;
  sendWsMessage?: (data: any) => void;
}

export const ANDROID_KEYCODES = {
  HOME: 3,
  BACK: 4,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  POWER: 26,
  MEDIA_PLAY_PAUSE: 85,
  MUTE: 164,
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
};

export const ANDROID_TOUCH = {
  ACTION_DOWN: 0,
  ACTION_UP: 1,
  ACTION_MOVE: 2,
};

export class TVRemoteBridge {
  private adb: AdbTouchInjector;
  private screenWidth: number;
  private screenHeight: number;
  private cursorX: number;
  private cursorY: number;

  constructor(adb: AdbTouchInjector, screenWidth = 1080, screenHeight = 2340) {
    this.adb = adb;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.cursorX = Math.floor(screenWidth / 2);
    this.cursorY = Math.floor(screenHeight / 2);
  }

  public getCursorPosition() {
    return {
      x: this.cursorX,
      y: this.cursorY,
      percentX: (this.cursorX / this.screenWidth) * 100,
      percentY: (this.cursorY / this.screenHeight) * 100
    };
  }

  public handleCommand(cmd: RemoteCommandPayload): void {
    const { action, payload } = cmd;

    switch (action) {
      case 'home':
        this.dispatchKey(ANDROID_KEYCODES.HOME);
        break;
      case 'back':
        this.dispatchKey(ANDROID_KEYCODES.BACK);
        break;
      case 'power':
        this.dispatchKey(ANDROID_KEYCODES.POWER);
        break;
      case 'vol_up':
        this.dispatchKey(ANDROID_KEYCODES.VOLUME_UP);
        break;
      case 'vol_down':
        this.dispatchKey(ANDROID_KEYCODES.VOLUME_DOWN);
        break;
      case 'mute':
        this.dispatchKey(ANDROID_KEYCODES.MUTE);
        break;
      case 'media_play_pause':
        this.dispatchKey(ANDROID_KEYCODES.MEDIA_PLAY_PAUSE);
        break;
      case 'dpad_up':
        this.dispatchKey(ANDROID_KEYCODES.DPAD_UP);
        break;
      case 'dpad_down':
        this.dispatchKey(ANDROID_KEYCODES.DPAD_DOWN);
        break;
      case 'dpad_left':
        this.dispatchKey(ANDROID_KEYCODES.DPAD_LEFT);
        break;
      case 'dpad_right':
        this.dispatchKey(ANDROID_KEYCODES.DPAD_RIGHT);
        break;
      case 'trackpad_move':
        if (payload && typeof payload.dx === 'number' && typeof payload.dy === 'number') {
          const sensitivity = 2.2;
          this.cursorX = Math.max(0, Math.min(this.screenWidth, this.cursorX + payload.dx * sensitivity));
          this.cursorY = Math.max(0, Math.min(this.screenHeight, this.cursorY + payload.dy * sensitivity));
        }
        break;
      case 'trackpad_tap':
        this.injectTap(this.cursorX, this.cursorY);
        break;
    }
  }

  private dispatchKey(keyCode: number) {
    if (this.adb.sendKeyEvent) {
      this.adb.sendKeyEvent(0, keyCode, 0);
      this.adb.sendKeyEvent(1, keyCode, 0);
    } else if (this.adb.sendWsMessage) {
      this.adb.sendWsMessage({ type: 'keyevent', keyCode });
    }
  }

  private injectTap(x: number, y: number) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (this.adb.sendTouch) {
      this.adb.sendTouch(ANDROID_TOUCH.ACTION_DOWN, 0, rx, ry, 1);
      setTimeout(() => {
        this.adb.sendTouch?.(ANDROID_TOUCH.ACTION_UP, 0, rx, ry, 0);
      }, 50);
    } else if (this.adb.sendWsMessage) {
      this.adb.sendWsMessage({ type: 'touch', action: 'tap', x: rx, y: ry });
    }
  }
}
