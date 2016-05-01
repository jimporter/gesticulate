/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["MouseGestureHandler"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("chrome://gesticulate/content/log.jsm");

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
 * @return The mapped button index
 */
function fromButtons(x) {
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
 * Map a button index to a button bitmask (effectively, Event.button =>
 * Event.buttons).
 *
 * @param x A button index
 * @return The mapped button bitmask
 */
function toButtons(x) {
  switch (x) {
  case 0: return 1;
  case 1: return 4;
  case 2: return 2;
  case 3: return 8;
  case 4: return 16;
  default: throw new Error("unexpected button");
  }
}

/**
 * Zoom an <img> element by a particular factor.
 *
 * @param img The image to zoom
 * @param factor The factor to zoom by
 */
function zoomImage(img, factor) {
  if (img.tagName !== "IMG")
    return;

  let width = parseFloat(img.width);
  let height = parseFloat(img.height);
  img.width = width * factor;
  img.height = height * factor;
}

/**
 * Create a new mouse gesture handler.
 *
 * @param window The window to handle gestures for
 */
function MouseGestureHandler(window) {
  this._window = window;

  this._bound = new Map();
  for (var i of ["mousedown", "mouseup", "click", "contextmenu", "wheel",
                 "gesture"]) {
    var bound = this[i].bind(this);
    this._bound.set(i, bound);
    this._window.addEventListener(i, bound, true);
  }
}

MouseGestureHandler.prototype = {
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
      this._window.removeEventListener(k, v, true);
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
    return platform !== "Windows_NT";
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

    let oldState = event.buttons - toButtons(event.button);
    debug(this._window, "mousedown", oldState, event.buttons, event);

    if (oldState === 0) {
      // Firefox swallows pending events during page unloads; make sure we're
      // in the proper state if we exited the gesture.
      this._performingGesture = false;
    } else if (isPow2(oldState)) {
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
    if (event.mozInputSource !== Ci.nsIDOMMouseEvent.MOZ_SOURCE_MOUSE ||
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
    if (event.mozInputSource !== Ci.nsIDOMMouseEvent.MOZ_SOURCE_MOUSE ||
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

  wheel: function(event) {
    if (event.mozInputSource !== Ci.nsIDOMMouseEvent.MOZ_SOURCE_MOUSE ||
        !event.isTrusted)
      return;

    if (event.buttons === 0) {
      // Firefox swallows pending events during page unloads; make sure we're
      // in the proper state if we exited the gesture.
      this._performingGesture = false;
    } else if (event.buttons === 4) {
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

  /**
   * Perform a gesture. XXX: Allow configuring these actions one day.
   *
   * @param event The event to handle
   */
  gesture: function(event) {
    debug(this._window, "*** GESTURE %s ***", event.detail.id);

    if (event.detail.id === "rocker:2,0")
      this._window.BrowserBack();
    else if (event.detail.id === "rocker:0,2")
      this._window.BrowserForward();
    else if (event.detail.id === "rocker:1,0")
      this._window.gBrowser.tabContainer.advanceSelectedTab(-1, true);
    else if (event.detail.id === "rocker:1,2")
      this._window.gBrowser.tabContainer.advanceSelectedTab(1, true);
    else if (event.detail.id === "wheel:-1")
      zoomImage(event.target, 2);
    else if (event.detail.id === "wheel:1")
      zoomImage(event.target, 1/2);
  },
};
