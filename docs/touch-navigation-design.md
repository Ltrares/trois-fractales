# Touch Navigation Design

## Goal
Allow pointer-only navigation on touch devices (no keyboard).

## PC Controls (current)
- Mouse look (pointer lock)
- Mouse down to move forward in look direction (not yet implemented)
- WASD for movement

## Touch Controls (Option 1: Touch-drag + hold)

### Behavior
1. **Touch + drag** - Look around (updates yaw/pitch)
2. **Touch + hold still** (~200ms) - Move forward in look direction
3. **Drag while holding** - Look while moving

### Implementation Notes

```js
// Touch state to add to CameraController
this.touch = {
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0,
    isMoving: false,        // true when hold threshold met
    moveThreshold: 20,      // px - movement beyond this = looking only
    holdDelay: 200,         // ms before forward movement starts
};
```

### Event Handlers
- `touchstart` - Record position/time, set active
- `touchmove` - Calculate delta from last position, apply to yaw/pitch, update lastX/lastY
- `touchend` - Clear active, stop movement

### Update Loop
```js
// In update():
if (touch.active && (now - startTime > holdDelay)) {
    // Check if finger stayed relatively still (within moveThreshold)
    // If so, move forward in look direction
}
```

## Open Questions

1. **Sensitivity** - Touch drags cover more screen distance than mouse. Add separate `TOUCH_SENS` constant?

2. **Enter gallery** - Single tap to dismiss start overlay, or require hold?

3. **Pause handling** - No ESC key on mobile. Options:
   - Add visible pause button
   - Two-finger tap gesture
   - Tap specific screen corner

4. **Zoom** - Z key for zoom on desktop. Touch equivalent?
   - Pinch to zoom?
   - Double-tap and hold?

## Alternative Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| Virtual joysticks | On-screen joystick overlays | Familiar to mobile gamers | UI clutter |
| Tap-to-move | Tap destination to walk there | Very accessible | Less immersive |
| Split-screen zones | Left=move, Right=look | No visible UI | Learning curve |
| Gyroscope look | Device orientation for looking | Very immersive | Can be disorienting |

## References
- Current input handling: `src/camera/camera-controller.js`
- Constants: `src/utils/constants.js`
