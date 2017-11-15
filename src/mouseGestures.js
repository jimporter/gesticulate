/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Map a button bitmask containing only one set bit to a button index
 * (effectively, Event.buttons => Event.button).
 *
 * @param x A button bitmask
 * @return The mapped button index
 */
function fromButtons(x) {
  switch (x) {
  case 1:  return 0;
  case 2:  return 2;
  case 4:  return 1;
  case 8:  return 3;
  case 16: return 4;
  default: return undefined;
  }
}

/**
 * Map a button index to a button bitmask (effectively, Event.button =>
 * Event.buttons).
 *
 * @param x A button index
 * @return The mapped button bitmask
 */
function toButtons(x) {
  switch (x) {
  case 0:  return 1;
  case 1:  return 4;
  case 2:  return 2;
  case 3:  return 8;
  case 4:  return 16;
  default: return undefined;
  }
}

/**
 * Create a new mouse gesture observer.
 *
 * @param window The window to observe gestures for
 */
function MouseGestureObserver(window) {
  this._window = window;

  this._bound = new Map();
  for (var i of ["mousedown", "mouseup", "click", "contextmenu", "wheel"]) {
    var bound = this[i].bind(this);
    this._bound.set(i, bound);
    this._window.addEventListener(i, bound, true);
  }

  // Initialize internal mouse gesture state from current global state.
  browser.runtime.sendMessage({type: "mouseState"}).then((mouseState) => {
    this.__performingGesture = mouseState.performingGesture;
  });

  // Synchronize internal mouse gesture state across tabs.
  browser.runtime.onMessage.addListener((message) => {
    switch (message.type) {
    case "performingGesture":
      this.__performingGesture = message.value;
      break;
    }
  });
}

MouseGestureObserver.prototype = {
  // True if we're performing a gesture; this lets us know when to suppress
  // mouse events. Note: this remains true until the next time a non-gesture
  // mousedown event occurs (i.e. when there were no other mouse buttons already
  // pressed).
  __performingGesture: false,

  get _performingGesture() {
    return this.__performingGesture;
  },

  set _performingGesture(value) {
    this.__performingGesture = value;
    browser.runtime.sendMessage({type: "performingGesture", value});
    return value;
  },

  /**
   * Clean up the mouse gesture observer, detaching all event listeners.
   */
  cleanup: function() {
    for (var [k, v] of this._bound.entries()) {
      this._window.removeEventListener(k, v, true);
    }
  },

  /**
   * Get the button to use for mouse gestures.
   */
  get _gestureButton() {
    // XXX: Support a pref for setting the gesture button (it used to be
    // "extensions.gesticulate.gesture_button").
    return 2;
  },

  /**
   * Handle the mousedown event. Currently, we consider something to be a rocker
   * gesture if a single button was pressed before this event, and now two
   * buttons are pressed.
   *
   * Note: This does mean that it's possible to change the "base" of the rocker
   * gesture (e.g hold RMB, hold LMB ("go back") release RMB, hold RMB ("go
   * forward")). I'm not convinced this is really a problem, though.
   *
   * @param event The event to handle
   */
  mousedown: function(event) {
    if (!event.isTrusted)
      return;

    let buttons = event.buttons;
    let oldState = buttons - toButtons(event.button);
    debug("mousedown", oldState, event.buttons, buttons,
          toButtons(event.button), event);

    if (oldState === 0) {
      this._performingGesture = false;
    } else if (fromButtons(oldState) !== undefined) {
      event.target.dispatchEvent(new this._window.CustomEvent(
        "gesture", { detail: {
          subtype: "rocker",
          firstButton: fromButtons(oldState),
          secondButton: event.button,
          id: "rocker:" + fromButtons(oldState) + "," + event.button
        }}
      ));
      this._performingGesture = true;

      event.preventDefault();
      event.stopPropagation();
    }
  },

  /**
   * Handle the mouseup event. Once no buttons are being pressed, we consider
   * the rocker gesture to be over.
   *
   * @param event The event to handle
   */
  mouseup: function(event) {
    if (!event.isTrusted)
      return;

    debug("mouseup", event);

    if (this._performingGesture) {
      event.preventDefault();
      event.stopPropagation();
    }
  },

  /**
   * Handle the click event. This is necessary to suppress clicks that happened
   * during a gesture.
   *
   * @param event The event to handle
   */
  click: function(event) {
    if (event.mozInputSource !== MouseEvent.MOZ_SOURCE_MOUSE ||
        !event.isTrusted)
      return;

    if (this._performingGesture) {
      debug("suppressed click");

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    debug("click", event);
  },

  /**
   * Handle the contextmenu event. This is necessary to suppress clicks that
   * happened during a gesture.
   *
   * @param event The event to handle
   */
  contextmenu: function(event) {
    if (event.mozInputSource !== MouseEvent.MOZ_SOURCE_MOUSE ||
        !event.isTrusted)
      return;

    if (this._performingGesture) {
      debug("suppressed contextmenu");

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    debug("contextmenu", event);
  },

  /**
   * Handle the wheel event. If the middle mouse button is being pressed, this
   * is a wheel gesture.
   *
   * @param event The event to handle
   */
  wheel: function(event) {
    if (event.mozInputSource !== MouseEvent.MOZ_SOURCE_MOUSE ||
        !event.isTrusted)
      return;

    if (event.buttons === 0) {
      this._performingGesture = false;
    } else if (fromButtons(event.buttons) === this._gestureButton) {
      let dir = event.deltaY > 0 ? 1 : -1;
      event.target.dispatchEvent(new this._window.CustomEvent(
        "gesture", { detail: {
          subtype: "wheel",
          direction: dir,
          id: "wheel:" + dir
        }}
      ));
      this._performingGesture = true;

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    debug("wheel", event);
  },
};
