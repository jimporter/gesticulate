/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm")

function setupWindow(window) {
  Cu.import("resource://gesticulate/gestures.jsm");
  Cu.import("resource://gesticulate/mouseGestures.jsm");

  return {
    gestures: new GestureHandler(window),
    mouseGestures: new MouseGestureObserver(window),
  };
}

function cleanupWindow(window, state) {
  state.gestures.cleanup();
  state.mouseGestures.cleanup();
}

var injector;

function startup(data, reason) {
  Cu.import("resource://gesticulate/windowUtils.jsm");
  Cu.import("resource://gesticulate/defaultPrefs.jsm");

  // Load the default prefs.
  Services.scriptloader.loadSubScript(
    "chrome://gesticulate/content/prefs.js", {pref: setDefaultPref}
  );

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
