/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["GestureHandler"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gesticulate/functions.jsm");
Cu.import("resource://gesticulate/log.jsm");

/**
 * Create a new gesture handler.
 *
 * @param window The window to handle gestures for
 */
function GestureHandler(window) {
  this._window = window;
  this._window.addEventListener("gesture", this, true);
}

GestureHandler.prototype = {
  /**
   * A mapping from gesture IDs to their functions; each takes the window the
   * event occurred in and the event itself.
   *
   * XXX: Allow configuring these actions one day.
   */
  _gestures: {
    "rocker:2,0": Functions.navigateBack,
    "rocker:0,2": Functions.navigateForward,
    "rocker:1,0": Functions.previousTab,
    "rocker:1,2": Functions.nextTab,
    "wheel:-1": Functions.zoomImageIn,
    "wheel:1": Functions.zoomImageOut,
  },

  /**
   * Clean up the gesture handler, detaching all event listeners.
   */
  cleanup: function() {
    this._window.removeEventListener("gesture", this, true);
  },

  /**
   * Handle the gesture event, performing the appropriate action.
   *
   * @param event The event to handle
   */
  handleEvent: function(event) {
    debug(this._window, "*** GESTURE %s ***", event.detail.id);

    if (event.detail.id in this._gestures)
      this._gestures[event.detail.id](this._window, event);
  },
};
