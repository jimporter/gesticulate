/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function setupWindow(window) {
  Cu.import("chrome://gesticulate/content/mouseGestures.jsm");

  return {
    gestures: new MouseGestureHandler(window)
  };
}

function cleanupWindow(window, state) {
  state.gestures.cleanup();
}

var injector;

function startup(data, reason) {
  Cu.import("chrome://gesticulate/content/windowUtils.jsm");
  injector = new WindowInjector("navigator:browser", setupWindow,
                                cleanupWindow);
  injector.start();
}

function shutdown(data, reason) {
  // Don't bother doing anything when the application is exiting.
  if (reason === APP_SHUTDOWN)
    return;

  injector.stop();
}

function install(data, reason) {}
function uninstall(data, reason) {}