/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function write(text) {
  var x = document.createElement("span");
  x.textContent = text;
  document.getElementsByTagName("label")[0].appendChild(x);
}

function Preferences(prefs) {
  this._defaultPrefs = prefs;
  this._prefs = {};
  for (let i in prefs)
    this._prefs[i] = prefs[i];

  this.loaded = browser.storage.local.get(
    Object.keys(prefs)
  ).then((results) => {
    for (let i in results)
      this._prefs[i] = results[i];
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local")
      return;
    for (let i in changes)
      this._prefs[i] = changes[i].newValue;
  });
}

Preferences.prototype = {
  getPref: function(pref) {
    return this._prefs[pref];
  },

  setPref: function(pref, value) {
    browser.storage.local.set({[pref]: value});
  },

  resetPref: function(pref) {
    browser.storage.local.remove(pref);
  },
};

const prefs = new Preferences({
  "debug": false,
  "gesture_button": 2,
});
