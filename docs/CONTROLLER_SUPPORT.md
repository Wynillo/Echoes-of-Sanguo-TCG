# Controller Support

Echoes of Sanguo supports Xbox-compatible controllers via the Gamepad API.

## Supported Controllers

- Xbox One / Xbox Series X|S (USB or Bluetooth)
- Xbox 360 (USB)
- PlayStation DualShock 4 / DualSense (partial support via Xbox mapping)
- Generic XInput controllers

## Button Mapping

| Button | Action |
|--------|--------|
| A | Confirm / Play card / Attack |
| B | Cancel / Close overlay |
| Start | Advance phase / End turn |
| Select/Back | Open options menu |
| D-Pad ↑↓←→ | Navigate between cards and zones |

## Haptic Feedback

Controller vibration is enabled for:
- Card draw (light pulse)
- Card play (medium pulse)
- Attack declaration (double pulse)
- Damage taken (heavy pulse)
- Phase change (light pulse)
- Turn end (medium pulse)

## Keyboard + Controller

Both keyboard and controller work simultaneously. Keyboard shortcuts remain available for rapid input, while controller provides navigation and confirmation.

## Visual Feedback

When a controller is connected:
- A golden focus ring highlights the currently selected card/zone
- Controller hints appear in the bottom-right corner showing button mappings
- A connection toast appears when the controller connects

## Controls Help

Press Select/Back to view the controller help modal showing all button mappings.

## Troubleshooting

**Controller not detected:**
1. Ensure controller is connected before opening the game
2. Try reconnecting via USB or Bluetooth
3. Check browser compatibility (Chrome, Edge, Firefox supported)

**Focus ring not visible:**
1. Ensure controller is connected (look for connection toast)
2. Press D-Pad to activate focus navigation

**Haptic feedback not working:**
1. Check browser vibration API support (not supported in Safari/iOS)
2. Ensure vibration permissions are granted (if applicable)

## Technical Implementation

- **Gamepad polling:** 100ms interval for responsive input
- **Button press detection:** Edge-triggered (fires on press, not hold)
- **Focus navigation:** Zones include monster fields, spell/trap zones, hand, and graveyard
- **CSS animations:** Pulsing focus ring with golden glow
