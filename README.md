# gesticulate

[![Download][download-image]][download-link]

**gesticulate** is a Firefox add-on that adds support for mouse gestures
(currently only rocker gestures). If you're simply looking to install the
add-on, you should look on [AMO][download-link] instead.

## Building

If you'd like to build the .xpi from the latest master, simply run the
following:

```sh
$ make package
```

Note of course that the resulting add-on is unsigned, and likely won't work on
release versions of Firefox.

## License

This add-on is [licensed][license-link] under the Mozilla Public License,
version 2.0.

[download-image]: https://img.shields.io/amo/v/gesticulate.svg
[download-link]: https://addons.mozilla.org/en-US/firefox/addon/gesticulate/
[license-link]: https://github.com/jimporter/gesticulate/blob/master/LICENSE
