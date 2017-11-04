/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This is a list of useful functions for gestures to perform. All public
 * functions take the window the event occurred in and the event itself.
 */
const Functions = {
  /**
   * Go back one page.
   */
  navigateBack: function(window, event) {
    window.history.back();
  },

  /**
   * Go forward one page.
   */
  navigateForward: function(window, event) {
    window.history.forward();
  },

  /**
   * Go to the previous tab, cycling around if we're at the beginning.
   */
  previousTab: function(window, event) {
    browser.runtime.sendMessage({type: "cycleTab", offset: -1});
  },

  /**
   * Go to the next tab, cycling around if we're at the end.
   */
  nextTab: function(window, event) {
    browser.runtime.sendMessage({type: "cycleTab", offset: 1});
  },

  /**
   * Zoom an <img> element by a particular factor.
   *
   * @param img The image to zoom
   * @param factor The factor to zoom by
   */
  _zoomImage: function(img, factor) {
    if (img.tagName !== "IMG")
      return;

    let width = parseFloat(img.width);
    let height = parseFloat(img.height);
    img.width = width * factor;
    img.height = height * factor;
  },

  /**
   * Zoom an image in by a factor of two.
   */
  zoomImageIn: function(window, event) {
    Functions._zoomImage(event.target, 2);
  },

  /**
   * Zoom an image out by a factor of two.
   */
  zoomImageOut: function(window, event) {
    Functions._zoomImage(event.target, 1/2);
  },
};

