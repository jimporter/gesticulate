/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["MouseGestureHandler"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const platform = Cc["@mozilla.org/system-info;1"]
                   .getService(Ci.nsIPropertyBag2).getProperty("name");

/**
 * Determine if an integer is a power of 2.
 *
 * @param x A non-negative integer
 * @return true if x is a power of 2, false otherwise
 */
function isPow2(x) {
  return x !== 0 && (x & (x - 1)) === 0;
}

/**
 * Map a button bitmask containing only one set bit to a button index
 * (effectively, Event.buttons => Event.button).
 *
 * @param x A button bitmask
 * @return The mapp button index
 */
function mapButtons(x) {
  switch (x) {
  case 1:  return 0;
  case 2:  return 2;
  case 4:  return 1;
  case 8:  return 3;
  case 16: return 4;
  default: throw new Error("unexpected buttons mask");
  }
}

/**
 * Create a new mouse gesture handler.
 *
 * @param window The window to handle gestures for
 */
function MouseGestureHandler(window) {
  this._window = window;

  this._bound = new Map();
  for (var i of ["mousedown", "mouseup", "click", "contextmenu"]) {
    var bound = this[i].bind(this);
    this._bound.set(i, bound);
    this._window.gBrowser.addEventListener(i, bound, true);
  }
}

MouseGestureHandler.prototype = {
  // The current state of the mouse buttons, as a bitmask (see Event.buttons).
  _mouseState: 0,

  // True if we're performing a gesture; this lets us know when to suppress
  // mouse events.
  _performingGesture: false,

  // True if the browser tried to open a context menu and we want to delay it
  // until the corresponding click event.
  _wantContextMenu: false,

  /**
   * Clean up the mouse gesture handler, detaching all event listeners.
   */
  cleanup: function() {
    for (var [k, v] of this._bound.entries()) {
      this._window.gBrowser.removeEventListener(k, v, true);
    }
  },

  /**
   * Determine if the context menu's popup should be delayed. This is necessary
   * on non-Windows platforms because it pops up on mousedown, which can
   * visually interrupt a rocker gesture.
   *
   * XXX: Allow this to be set by a pref.
   */
  get _delayContextMenu() {
    return platform !== 'Windows_NT';
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
    let oldState = this._mouseState;
    this._mouseState = event.buttons;
    this._window.console.log("mousedown", oldState, this._mouseState, event);

    if (isPow2(oldState)) {
      let diff = this._mouseState - oldState;
      this._performingGesture = true;
      this.performGesture(mapButtons(oldState), mapButtons(diff));

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
    this._window.console.log("mouseup", event);
    this._mouseState = event.buttons;

    if (this._performingGesture) {
      if (event.buttons === 0) {
        // Delay exiting the gesture so that we can suppress the last click
        // event generated from this mouseup.
        this._window.setTimeout(() => {
          this._window.console.log("gesture exited");
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
    if (event.mozInputSource !== Ci.nsIDOMMouseEvent.MOZ_SOURCE_MOUSE)
      return;

    let wantedContextMenu = this._wantContextMenu;
    this._wantContextMenu = false;

    if (this._performingGesture) {
      this._window.console.log("suppressed click");

      // On Windows, this should suppress the contextmenu event as well.
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this._window.console.log("click", event);
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
    if (event.mozInputSource !== Ci.nsIDOMMouseEvent.MOZ_SOURCE_MOUSE)
      return;

    if (this._delayContextMenu) {
      this._window.console.log("suppressed contextmenu - too early!");
      this._wantContextMenu = true;

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this._window.console.log("contextmenu", event);
  },

  /**
   * Perform a gesture. XXX: Allow configuring these actions one day.
   *
   * @param first The first button that was pressed
   * @param second The second button that was pressed
   */
  performGesture: function(first, second) {
    this._window.console.log("*** GESTURE ***", first, second);

    if (first === 2 && second === 0)
      this._window.BrowserBack();
    else if (first === 0 && second === 2)
      this._window.BrowserForward();
    else if (first === 1 && second === 0)
      this._window.gBrowser.tabContainer.advanceSelectedTab(-1, true);
    else if (first === 1 && second === 2)
      this._window.gBrowser.tabContainer.advanceSelectedTab(1, true);
  }
};
