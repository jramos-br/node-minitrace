/**
 * @file Prints trace messages to the console using lazy write.
 * @copyright (C) 2018 Jorge Ramos {@link https://github.com/jramos-br}
 * @license MIT. This program is free software, licensed under the MIT License
 * as published by the Open Source Initiative. It is distributed in the hope
 * that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * file LICENSE for more details. If you don't find it, please see the MIT
 * License template at {@link http://opensource.org/licenses/MIT}.
 * @author Jorge Ramos <jramos@pobox.com>
 * @description This module creates an object to format and send trace messages using
 * `console.log()`. Messages do not print immediately. Instead, on each call, they are
 * inserted into a queue, which is automatically flushed when the process ends.
 * @module trace-log
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
 * @returns A message to be enqueued in the message queue with the given data.
 */
function Message(text, width) {
  this.next = null;
  this.text = text;
  this.width = width;
}

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
 * Each message is printed using `console.log()`;
 * This function is called automatically when the process ends.
 */
function show() {
  var curr = ctx.head;
  if (curr) {
    console.log(repeat('-', 80));
    var indentwidth = 0;
    var indentation = '';
    do {
      if (curr.width !== indentwidth) {
        indentwidth = curr.width;
        indentation = repeat(' ', indentwidth);
      }
      console.log(indent(indentation, curr.text));
      curr = curr.next;
    } while (curr);
  }
}

/**
 * Enqueues a text message in the message queue, to be printed later.
 * @param {string} text The text of the message to be printed.
 */
function write(text) {
  var message = new Message(text, ctx.indentWidth);
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
  write(util.format.apply(util, arguments));
};

/**
 * Formats a message and enqueues the result for later printing.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is enqueued to be printed with `console.log()`.
 */
exports.warn = function() {
  write(util.format.apply(util, arguments));
};

/**
 * Formats a message and enqueues the result for later printing.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 * @description The arguments are all passed to `util.format()`. The formatted message
 * is enqueued to be printed with `console.log()`.
 */
exports.error = function() {
  write(util.format.apply(util, arguments));
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
  write(text);
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
  write(text);
};

// Schedules a callback to show the log when process ends.
process.on('exit', show);
