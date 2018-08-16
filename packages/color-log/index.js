/**
 * @file Prints to the console styled with colors.
 * @copyright (C) 2018 Jorge Ramos {@link https://github.com/jramos-br}
 * @license MIT. This program is free software, licensed under the terms of the
 * MIT License as published by the Open Source Initiative. It is distributed in
 * the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the file LICENSE for more details. If you don't find it, please see the
 * MIT License template at {@link http://opensource.org/licenses/MIT}.
 * @author Jorge Ramos <jramos@pobox.com>
 * @description This module creates an object to format and print messages using the
 * console functions. If ANSI color display is available, then the output will be
 * styled with ANSI colors.
 * @module color-log
 */

// Declares Strict Mode.
'use strict';

/**
 * The `util` module is primarily designed to support the needs of Node.js' own internal
 * APIs. However, many of the utilities are useful for application and module developers
 * as well.
 * @requires util
 * https://nodejs.org/api/util.html
 */
var util = require('util');

/**
 * Styles used for color printing.
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code
 */
var styles = (function() {
  var hascolor = (function() {
    if (process.platform === 'win32') {
      var os = require('os');
      var release = parseInt(os.release(), 10);
      if (!isNaN(release) && release >= 10) {
        return true;
      }
    }
    var terms = /^screen|^xterm|^vt100|^rxvt|color|ansi|cygwin|linux/i;
    if (terms.test(process.env.TERM)) {
      return true;
    }
    return false;
  })();
  return {
    /** Informational message style. */
    log: null,
    /** Warning message style. */
    warn: hascolor ? ['\x1b[33m', '\x1b[39m'] : null,
    /** Error message style. */
    error: hascolor ? ['\x1b[31m', '\x1b[39m'] : null
  };
})();

/**
 * Indentation required via `console.group()`.
 * Used only if `console.group()` is undefined.
 */
var indentation = '';

/**
 * Inserts indentation at beginning of a string.
 * @param {string} text The string to indent.
 * @returns {string} The given string prepended with current indentation.
 * If `console.group()` is defined, the function returns the unaltered given string,
 * because the indentation is handled by `console.group()`.
 */
var indent = console.group
  ? function(text) {
    return text;
  }
  : function(text) {
    if (indentation.length !== 0) {
      if (text.indexOf('\n') !== -1) {
        text = text.replace(/\n/g, '\n' + indentation);
      }
      text = indentation + text;
    }
    return text;
  };

/**
 * Formats a message and prints the result to `stdout` with newline
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is printed with `console.log()` using the current console color.
 */
exports.log = function() {
  var message = util.format.apply(util, arguments);
  var style = process.stdout.isTTY ? styles.log : null;
  if (style) {
    console.log(style[0] + indent(message) + style[1]);
  } else {
    console.log(indent(message));
  }
};

/**
 * Formats a warning message and prints the result to `stderr` with newline
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is printed with `console.warn()`. If ANSI color display is available, then the output
 * will be styled with an ANSI color.
 */
exports.warn = function() {
  var message = util.format.apply(util, arguments);
  var style = process.stderr.isTTY ? styles.warn : null;
  if (style) {
    console.warn(style[0] + indent(message) + style[1]);
  } else {
    console.warn(indent(message));
  }
};

/**
 * Formats an error message and prints the result to `stderr` with newline
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is printed with `console.error()`. If ANSI color display is available, then the output
 * will be styled with an ANSI color.
 */
exports.error = function() {
  var message = util.format.apply(util, arguments);
  var style = process.stderr.isTTY ? styles.error : null;
  if (style) {
    console.error(style[0] + indent(message) + style[1]);
  } else {
    console.error(indent(message));
  }
};

/**
 * Formats an optional message, prints the result to `stdout` with newline and increases
 * the indentation of subsequent lines.
 * @param {any} args An optional message to be formatted and printed. Multiple arguments
 * can be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is printed with `console.log()` using the current console color.
 */
exports.group = console.group
  ? function() {
    if (arguments.length > 0) {
      exports.log.apply(exports, arguments);
    }
    console.group();
  }
  : function() {
    if (arguments.length > 0) {
      exports.log.apply(exports, arguments);
    }
    indentation += '  ';
  };

/**
 * Decreases the indentation of subsequent lines.
 */
exports.groupEnd = console.groupEnd
  ? function() {
    console.groupEnd();
  }
  : function() {
    if (indentation.length !== 0) {
      indentation = indentation.slice(0, indentation.length - 2);
    }
  };
