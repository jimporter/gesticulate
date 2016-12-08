/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function debug(window, ...args) {
  // XXX: Add a pref for toggling debug logging.
  window.console.log(...args);
}

function warn(window, ...args) {
  window.console.warn(...args);
}

function error(window, ...args) {
  window.console.error(...args);
}
