/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["MouseGestureObserver"];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm")
Cu.import("resource://gesticulate/log.jsm");

const platform = Cc["@mozilla.org/system-info;1"]
                   .getService(Ci.nsIPropertyBag2).getProperty("name");

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
}

MouseGestureObserver.prototype = {
  // True if we're performing a gesture; this lets us know when to suppress
  // mouse events.
  _performingGesture: false,

  // True if the browser tried to open a context menu and we want to delay it
  // until the corresponding click event.
  _wantContextMenu: false,

  /**
   * Clean up the mouse gesture observer, detaching all event listeners.
   */
  cleanup: function() {
    for (var [k, v] of this._bound.entries()) {
      this._window.removeEventListener(k, v, true);
    }
  },

  /**
   * Determine if the context menu's popup should be delayed. This is necessary
   * on non-Windows platforms because it pops up on mousedown, which can
   * visually interrupt a rocker gesture.
   */
  get _delayContextMenu() {
    return platform !== "Windows_NT" && Services.prefs.getBoolPref(
      "extensions.gesticulate.delay_context_menu"
    );
  },

  /**
   * Get the button to use for mouse gestures.
   */
  get _gestureButton() {
    return Services.prefs.getIntPref("extensions.gesticulate.gesture_button");
  },

  /**
   * Reset the internal state to the default if we were performing a gesture.
   * This is necessary because Firefox swallows pending events during page
   * unloads.
   */
  _resetState: function() {
    // We only reset when we know we were already performing a gesture because
    // recent Firefox builds on Linux fire the contextmenu event *before* the
    // mousedown event. If we don't do this, we'll forget that we had a context
    // menu queued up.
    if (this._performingGesture) {
      this._performingGesture = false;
      this._wantContextMenu = false;
    }
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
    debug(this._window, "mousedown", oldState, event.buttons, buttons,
          toButtons(event.button), event);

    if (oldState === 0) {
      // Firefox swallows pending events during page unloads; make sure we're
      // in the proper state if we exited the gesture.
      this._resetState();
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

    debug(this._window, "mouseup", event);

    if (this._performingGesture) {
      if (event.buttons === 0) {
        // Delay exiting the gesture so that we can suppress the last click
        // event generated from this mouseup.
        this._window.setTimeout(() => {
          debug(this._window, "gesture exited");
          this._performingGesture = false;
        }, 0);
      }

      event.preventDefault();
      event.stopPropagation();
    }
  },

  /**
   * Handle the click event. This is necessary for two reasons: 1) to suppress
   * clicks that happened during a gesture, and 2) to synthesize a contextmenu
   * event for Linux/OS X(?), since they pop up their context menus on
   * mousedown, which disrupts the UI of rocker gestures.
   *
   * @param event The event to handle
   */
  click: function(event) {
    if (event.mozInputSource !== MouseEvent.MOZ_SOURCE_MOUSE ||
        !event.isTrusted)
      return;

    let wantedContextMenu = this._wantContextMenu;
    this._wantContextMenu = false;

    if (this._performingGesture) {
      debug(this._window, "suppressed click");

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    debug(this._window, "click", event);
    if (wantedContextMenu) {
      // This doesn't trigger our contextmenu handler below, so we don't need to
      // worry about it being supressed.
      event.target.dispatchEvent(new this._window.MouseEvent(
        "contextmenu", event
      ));
    }
  },

  /**
   * Handle the contextmenu event. This is needed on Linux/OS X(?), since they
   * pop up their context menus on mousedown, which disrupts the UI of rocker
   * gestures.
   *
   * @param event The event to handle
   */
  contextmenu: function(event) {
    if (event.mozInputSource !== MouseEvent.MOZ_SOURCE_MOUSE ||
        !event.isTrusted)
      return;

    if (this._performingGesture || this._delayContextMenu) {
      debug(this._window, "suppressed contextmenu");
      if (this._delayContextMenu)
        this._wantContextMenu = true;

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    debug(this._window, "contextmenu", event);
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
      // Firefox swallows pending events during page unloads; make sure we're
      // in the proper state if we exited the gesture.
      this._resetState();
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

    debug(this._window, "wheel", event);
  },
};
