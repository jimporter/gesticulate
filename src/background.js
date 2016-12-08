/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Cycle through the list of tabs in this window.
 *
 * @param offset The offset to cycle by (usually 1 or -1).
 * @return A Promise that resolves when the new tab is activated.
 */
function cycleTab(offset) {
  return browser.tabs.query({currentWindow: true}).then((tabs) => {
    let index = -1;
    for (let i = 0; i != tabs.length; i++) {
      if (tabs[i].active) {
        index = i;
        break;
      }
    }

    let nextIndex = (index + offset + tabs.length) % tabs.length;
    return tabs[nextIndex];
  }).then((tab) => {
    return browser.tabs.update(tab.id, {active: true});
  });
}

browser.runtime.onMessage.addListener((message) => {
  switch (message.command) {
  case "cycleTab":
    cycleTab(message.offset);
    break;
  default:
    console.error("unknown command", message.command);
  }
});
