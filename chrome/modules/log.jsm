/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["debug", "warn", "error"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

function debug(window, ...args) {
  if (Services.prefs.getBoolPref("extensions.gesticulate.debug"))
    window.console.log(...args);
}

function warn(window, ...args) {
  window.console.warn(...args);
}

function error(window, ...args) {
  window.console.error(...args);
}
