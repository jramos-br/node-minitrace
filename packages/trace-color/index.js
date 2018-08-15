/**
 * @file Prints trace messages to the console using color styles and lazy write.
 * @copyright (C) 2018 Jorge Ramos {@link https://github.com/jramos-br}
 * @license MIT. This program is free software, licensed under the MIT License
 * as published by the Open Source Initiative. It is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * file LICENSE for more details. If you don't find it, please see the MIT
 * License template at {@link http://opensource.org/licenses/MIT}.
 * @author Jorge Ramos <jramos@pobox.com>
 * @description This module creates an object to format and send trace messages using
 * the console functions. Messages do not print immediately. Instead, on each call, they
 * are inserted into a queue, which is automatically flushed when the process ends.
 * If ANSI color display is available, then the output will be styled with ANSI colors.
 * @module trace-color
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
 * Concatenates a number of copies of a given string.
 * @param {string} str The string to be repeated.
 * @param {number} count An integer indicating the number of times to repeat `str`.
 * @returns {string} A new string containing the specified number of copies of the given
 * string.
 */
function repeat(str, count) {
  return new Array(count + 1).join(str);
}

/**
 * Joins two strings into a new string, separated by one space.
 * @param {string} str1 The first string.
 * @param {string} str2 The second string.
 * @returns {string} A new string containing the given strings separated by one space.
 */
function join2(str1, str2) {
  var res;
  if (str1) {
    res = str2 ? str1 + ' ' + str2 : str1;
  } else {
    res = str2 === undefined || str2 === null ? '' : str2;
  }
  return res;
}

/**
 * Creates a message to be enqueued in the message queue.
 * @constructor
 * @param {string} text The message text.
 * @param {number} width The indentation width.
 * @param {number} type The message type: `LOG`, `WARN` or `ERROR`.
 * @returns A message to be enqueued in the message queue with the given data.
 */
function Message(text, width, type) {
  this.next = null;
  this.text = text;
  this.width = width;
  this.type = type;
}

/** Informational message type. */
Message.prototype.LOG = 1;
/** Warning message type. */
Message.prototype.WARN = 2;
/** Error message type. */
Message.prototype.ERROR = 3;

/**
 * Private data of the module.
 */
var ctx = {
  /** Number of spaces in an indent. */
  indentSize: 2,
  /** Indent level. */
  indentLevel: 0,
  /** Current indentation width (`indentLevel` times `indentSize`). */
  indentWidth: 0,
  /** Head of message queue. */
  head: null,
  /** Tail of message queue. */
  tail: null,
  /** Saved names for `enter()` and `leave()`. */
  names: []
};

/**
 * Creates a printer to print messages to the console.
 * If ANSI color display is available, then the output will be styled with ANSI colors.
 */
function Printer() {
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
  var outcolor = hascolor && process.stdout.isTTY;
  var errcolor = hascolor && process.stderr.isTTY;
  /**
   * Styles used for color printing.
   * @see https://en.wikipedia.org/wiki/ANSI_escape_code
   */
  this.styles = {
    /** Informational message style. */
    log: outcolor ? ['\x1b[37m', '\x1b[39m'] : null,
    /** Warning message style. */
    warn: errcolor ? ['\x1b[33m', '\x1b[39m'] : null,
    /** Error message style. */
    error: errcolor ? ['\x1b[31m', '\x1b[39m'] : null
  };
}

/**
 * Prints to `stdout` with newline.
 * @param {string} message The message to be printed.
 * @description The message is printed with `console.log()`. If ANSI color display is
 * available, then the message will be styled with an ANSI color.
 */
Printer.prototype.log = function(message) {
  if (this.styles.log) {
    console.log(this.styles.log[0] + message + this.styles.log[1]);
  } else {
    console.log(message);
  }
};

/**
 * Prints to `stderr` with newline.
 * @param {string} message The message to be printed.
 * @description The message is printed with `console.warn()`. If ANSI color display is
 * available, then the message will be styled with an ANSI color.
 */
Printer.prototype.warn = function(message) {
  if (this.styles.warn) {
    console.warn(this.styles.warn[0] + message + this.styles.warn[1]);
  } else {
    console.warn(message);
  }
};

/**
 * Prints to `stderr` with newline.
 * @param {string} message The message to be printed.
 * @description The message is printed with `console.error()`. If ANSI color display is
 * available, then the message will be styled with an ANSI color.
 */
Printer.prototype.error = function(message) {
  if (this.styles.error) {
    console.error(this.styles.error[0] + message + this.styles.error[1]);
  } else {
    console.error(message);
  }
};

/**
 * Inserts indentation at beginning of a string.
 * @param {string} indentation The indentation to be prepended.
 * @param {string} text The string to indent.
 * @returns {string} The given string prepended with the given indentation.
 */
function indent(indentation, text) {
  if (indentation.length !== 0) {
    if (text.indexOf('\n') !== -1) {
      text = text.replace(/\n/g, '\n' + indentation);
    }
    text = indentation + text;
  }
  return text;
}

/**
 * Prints a header line followed by all messages in the message queue.
 * Each message is printed using the appropriate console function, according with the
 * message type (`LOG`, `WARN` or `ERROR`).
 * This function is called automatically when the process ends.
 * If ANSI color is available, then the output will be styled with ANSI color codes.
 */
function show() {
  var curr = ctx.head;
  if (curr) {
    var printer = new Printer();
    printer.log(repeat('-', 80));
    var indentwidth = 0;
    var indentation = '';
    do {
      if (curr.width !== indentwidth) {
        indentwidth = curr.width;
        indentation = repeat(' ', indentwidth);
      }
      if (curr.type === Message.prototype.LOG) {
        printer.log(indent(indentation, curr.text));
      } else if (curr.type === Message.prototype.WARN) {
        printer.warn(indent(indentation, curr.text));
      } else {
        printer.error(indent(indentation, curr.text));
      }
      curr = curr.next;
    } while (curr);
  }
}

/**
 * Enqueues a text message in the message queue, to be printed later.
 * @param {string} text The text of the message to be printed.
 * @param {number} type The message type: `LOG`, `WARN` or `ERROR`.
 */
function write(text, type) {
  var message = new Message(text, ctx.indentWidth, type);
  if (ctx.head === null) {
    ctx.head = message;
  } else {
    ctx.tail.next = message;
  }
  ctx.tail = message;
}

/**
 * Formats a message and enqueues the result for later printing.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is enqueued to be printed with `console.log()`.
 */
exports.log = function() {
  write(util.format.apply(util, arguments), Message.prototype.LOG);
};

/**
 * Formats a message and enqueues the result for later printing.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is enqueued to be printed with `console.warn()`.
 */
exports.warn = function() {
  write(util.format.apply(util, arguments), Message.prototype.WARN);
};

/**
 * Formats a message and enqueues the result for later printing.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is enqueued to be printed with `console.error()`.
 */
exports.error = function() {
  write(util.format.apply(util, arguments), Message.prototype.ERROR);
};

/**
 * Pretends to print a formatted message.
 * @param {any} args Multiple arguments can be passed. The arguments are all ignored.
 */
exports.ignore = function() {
};

/**
 * Formats an optional message, enqueues the result for later printing and increases the
 * indentation of subsequent lines.
 * @param {any} args An optional message to be formatted and printed. Multiple arguments
 * can be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is enqueued to be printed with `console.log()`.
 */
exports.indent = function() {
  if (arguments.length > 0) {
    exports.log.apply(exports, arguments);
  }
  ctx.indentWidth = ++ctx.indentLevel * ctx.indentSize;
};

exports.group = exports.indent;

/**
 * Decreases the indentation of subsequent lines.
 */
exports.unindent = function() {
  if (ctx.indentLevel > 0) {
    ctx.indentWidth = --ctx.indentLevel * ctx.indentSize;
  }
};

exports.groupEnd = exports.unindent;

/**
 * Formats a message, enqueues the result for later printing and increases the
 * indentation of subsequent lines.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is enqueued to be printed with `console.log()`. The first word of the formatted
 * message is saved to be printed automatically by `leave()`.
 */
exports.enter = function() {
  var message = util.format.apply(util, arguments);
  var match = message.match(/\w+/);
  ctx.names.push(match ? match[0] : message);
  var text = '>' + repeat(' ', ctx.indentSize - 1) + message;
  write(text, Message.prototype.LOG);
  exports.indent();
};

/**
 * Decreases the indentation of subsequent lines, formats an optional message and enqueues
 * the result for later printing.
 * @param {any} args An optional message to be formatted and printed. Multiple arguments
 * can be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is prepended with the word saved by `enter()`. The result is enqueued to be printed
 * with `console.log()`.
 */
exports.leave = function() {
  var message = util.format.apply(util, arguments);
  var name = ctx.names.pop();
  var text = '<' + repeat(' ', ctx.indentSize - 1) + join2(name, message);
  exports.unindent();
  write(text, Message.prototype.LOG);
};

// Schedules a callback to show the log when process ends.
process.on('exit', show);
