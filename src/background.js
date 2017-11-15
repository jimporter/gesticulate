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

const mouseState = {
  performingGesture: false,
};

const ports = new Set();

function broadcast(message, excludedSender) {
  for (let p of ports) {
    if (!excludedSender || p.sender.contextId !== excludedSender.contextId) {
      p.postMessage(message);
    }
  }
}

browser.runtime.onConnect.addListener((port) => {
  ports.add(port);
  port.onDisconnect.addListener(() => ports.delete(port));
});

browser.runtime.onMessage.addListener((message, sender, respond) => {
  console.log("received message", message, sender);
  switch (message.type) {
  case "cycleTab":
    cycleTab(message.offset);
    break;
  case "performingGesture":
    mouseState.performingGesture = message.value;
    broadcast(message, sender);
    break;
  case "mouseState":
    respond(mouseState);
    break;
  }
});
