import { useEffect, useState, useRef, useCallback } from 'react';

export interface GamepadState {
  connected: boolean;
  gamepadId: string | null;
  buttons: {
    a: boolean;
    b: boolean;
    x: boolean;
    y: boolean;
    start: boolean;
    select: boolean;
    dpadUp: boolean;
    dpadDown: boolean;
    dpadLeft: boolean;
    dpadRight: boolean;
    leftBumper: boolean;
    rightBumper: boolean;
  };
  axes: number[];
}

const GAMEPAD_POLL_INTERVAL = 100;

export function useGamepad() {
  const [state, setState] = useState<GamepadState>({
    connected: false,
    gamepadId: null,
    buttons: {
      a: false,
      b: false,
      x: false,
      y: false,
      start: false,
      select: false,
      dpadUp: false,
      dpadDown: false,
      dpadLeft: false,
      dpadRight: false,
      leftBumper: false,
      rightBumper: false,
    },
    axes: [0, 0, 0, 0],
  });

  const prevButtons = useRef<GamepadState['buttons']>({
    a: false, b: false, x: false, y: false,
    start: false, select: false,
    dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false,
    leftBumper: false, rightBumper: false,
  });

  const callbacks = useRef<{
    onA?: () => void;
    onB?: () => void;
    onStart?: () => void;
    onSelect?: () => void;
    onDpad?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  }>({});

  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0];

    if (!gamepad || !gamepad.connected) {
      setState(prev => {
        if (prev.connected) {
          return { ...prev, connected: false, gamepadId: null };
        }
        return prev;
      });
      return;
    }

    const buttons = {
      a: gamepad.buttons[0].pressed,
      b: gamepad.buttons[1].pressed,
      x: gamepad.buttons[2].pressed,
      y: gamepad.buttons[3].pressed,
      start: gamepad.buttons[9].pressed,
      select: gamepad.buttons[8].pressed,
      dpadUp: gamepad.buttons[12].pressed,
      dpadDown: gamepad.buttons[13].pressed,
      dpadLeft: gamepad.buttons[14].pressed,
      dpadRight: gamepad.buttons[15].pressed,
      leftBumper: gamepad.buttons[4].pressed,
      rightBumper: gamepad.buttons[5].pressed,
    };

    if (buttons.a && !prevButtons.current.a) callbacks.current.onA?.();
    if (buttons.b && !prevButtons.current.b) callbacks.current.onB?.();
    if (buttons.start && !prevButtons.current.start) callbacks.current.onStart?.();
    if (buttons.select && !prevButtons.current.select) callbacks.current.onSelect?.();
    
    if (buttons.dpadUp && !prevButtons.current.dpadUp) callbacks.current.onDpad?.('up');
    if (buttons.dpadDown && !prevButtons.current.dpadDown) callbacks.current.onDpad?.('down');
    if (buttons.dpadLeft && !prevButtons.current.dpadLeft) callbacks.current.onDpad?.('left');
    if (buttons.dpadRight && !prevButtons.current.dpadRight) callbacks.current.onDpad?.('right');

    prevButtons.current = buttons;

    setState({
      connected: true,
      gamepadId: gamepad.id,
      buttons,
      axes: Array.from(gamepad.axes),
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(pollGamepad, GAMEPAD_POLL_INTERVAL);
    
    const connectHandler = () => setState(prev => ({ ...prev, connected: true }));
    const disconnectHandler = () => setState(prev => ({ ...prev, connected: false }));
    
    window.addEventListener('gamepadconnected', connectHandler);
    window.addEventListener('gamepaddisconnected', disconnectHandler);
    
    pollGamepad();
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('gamepadconnected', connectHandler);
      window.removeEventListener('gamepaddisconnected', disconnectHandler);
    };
  }, [pollGamepad]);

  const registerCallbacks = useCallback((cbs: typeof callbacks.current) => {
    callbacks.current = cbs;
  }, []);

  return { ...state, registerCallbacks };
}
