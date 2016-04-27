/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["setDefaultPref"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

let prefs = Services.prefs.getDefaultBranch("");

function setDefaultPref(name, value) {
  switch (typeof value) {
  case "string":
    return prefs.setCharPref(name, value);
  case "number":
    return prefs.setIntPref(name, value);
  case "boolean":
    return prefs.setBoolPref(name, value);
  default:
    throw new Exception('unknown pref type ' + (typeof value));
  }
}
