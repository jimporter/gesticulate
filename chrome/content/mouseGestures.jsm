/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["MouseGestureHandler"];

function MouseGestureHandler(window) {
  this._window = window;

  this._bound = new Map();
  for (var i of ["mousedown", "mouseup", "contextmenu"]) {
    var bound = this[i].bind(this);
    this._bound.set(i, bound);
    this._window.gBrowser.addEventListener(i, bound, true);
  }
}

MouseGestureHandler.prototype = {
  _mouseState: 0,

  cleanup: function() {
    for (var [k, v] of this._bound.entries()) {
      this._window.gBrowser.removeEventListener(k, v, true);
    }
  },

  mouseup: function(event) {
    this._window.console.log("mouseup", event.buttons);
    this._mouseState = event.buttons;
  },

  mousedown: function(event) {
    let oldState = this._mouseState;
    this._window.console.log("mousedown", oldState, event.buttons);
    this._mouseState = event.buttons;

    if (oldState === 2 && event.buttons === 3)
      this._window.BrowserBack();
    else if (oldState === 1 && event.buttons === 3)
      this._window.BrowserForward();
  },

  contextmenu: function(event) {
    if (event.buttons === 0)
      return;
    this._window.console.log("contextmenu", event);
    event.preventDefault();
    event.stopPropagation();
  },
};
