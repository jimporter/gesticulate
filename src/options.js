/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const gesture_button = document.getElementById("gesture_button");
const debug = document.getElementById("debug");

prefs.loaded.then(() => {
  gesture_button.value = prefs.getPref("gesture_button").toString();
  debug.checked = prefs.getPref("debug");
});

gesture_button.addEventListener("change", (e) => {
  prefs.setPref("gesture_button", parseInt(e.target.value));
});
debug.addEventListener("change", (e) => {
  prefs.setPref("debug", e.target.checked);
});
