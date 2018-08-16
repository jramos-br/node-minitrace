/**
 * @file Test script for minitrace modules.
 * @copyright (C) 2018 Jorge Ramos {@link https://github.com/jramos-br}
 * @license MIT. This program is free software, licensed under the terms of the
 * MIT License as published by the Open Source Initiative. It is distributed in
 * the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the file LICENSE for more details. If you don't find it, please see the
 * MIT License template at {@link http://opensource.org/licenses/MIT}.
 * @author Jorge Ramos <jramos@pobox.com>
 * @description This script runs a quick test on all minitrace modules. Test results
 * should be evaluated visually.
 * @module trace-color
 */

// Declares Strict Mode.
'use strict';

/** Module names. */
var targets = [
  'color-log',
  'trace-color',
  'trace-console',
  'trace-log',
];
/** Selected module name. */
var target = targets[process.argv[2] || 0]; // No error-check, beware!
/** Selected module instance. */
var trace = require('./packages/' + target);

/**
 * Displays the name of the module being tested.
 */
function prologue() {
  console.log(repeat('-', 80));
  console.log('Testing ' + target);
  if (target == 'color-log') {
    console.log(repeat('-', 80));
  }
}

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
 * Formats and prints a message.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 */
var log = function() {
  if (trace.log) {
    trace.log.apply(trace, arguments);
  } else {
    console.error('log is undefined.');
    console.error.apply(console, arguments);
  }
};

/**
 * Formats and prints a warning message.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 */
var warn = function() {
  if (trace.warn) {
    trace.warn.apply(trace, arguments);
  } else {
    console.error('warn is undefined.');
    console.error.apply(console, arguments);
  }
};

/**
 * Formats and prints an error message.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 */
var error = function() {
  if (trace.error) {
    trace.error.apply(trace, arguments);
  } else {
    console.error('error is undefined.');
    console.error.apply(console, arguments);
  }
};

/**
 * Formats and prints a message then increases the indentation of subsequent lines.
 * @param {any} args The message to be formatted and printed. Multiple arguments can
 * be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 */
var enter = function() {
  if (trace.enter) {
    trace.enter.apply(trace, arguments);
  } else if (trace.group) {
    trace.group.apply(trace, arguments);
  } else {
    console.error('enter is undefined.');
    console.error.apply(console, arguments);
  }
};

/**
 * Decreases the indentation of subsequent lines then formats and prints an optional
 * message.
 * @param {any} args An optional message to be formatted and printed. Multiple arguments
 * can be passed, with the first used as the primary message and all additional used as
 * substitution values similar to `printf(3)`.
 */
var leave = function() {
  if (trace.leave) {
    trace.leave.apply(trace, arguments);
  } else if (trace.groupEnd) {
    trace.groupEnd.apply(trace);
    log.apply(null, arguments); // groupEnd has no args
  } else {
    console.error('leave is undefined.');
    console.error.apply(console, arguments);
  }
};

/**
 * Test function. A simple recursive factorial computation.
 * @param {number} value The current value whose factorial will be computed.
 * @param {number} first The original value whose factorial will be computed.
 * @returns The factorial of `value`.
 * @description This function computes the factorial of `value` and also calls several
 * trace methods to test them.
 */
function factorial(value, first) {
  var result;
  enter('factorial value=%d', value);
  try {
    if (value > 1) {
      log('calculating (%d-1)!', value);
      result = factorial(value - 1, first) * value;
    } else {
      if (first == 4) {
        warn('throwing...');
        try {
          throw new Error('throwing...');
        } catch (e) {
          error(e);
        }
        warn('throwing again...');
        throw new Error('throwing...');
      }
      log('returning 1');
      result = 1;
    }
  } finally {
    leave('result=%d', result);
  }
  return result;
}

/**
 * Test runner.
 */
function main() {
  var i;
  enter('main');
  try {
    for (i = 0; i < 5; ++i) {
      log('%d! = %d', i, factorial(i, i));
    }
  } finally {
    leave();
  }
}

/*
 * Main program protected by a try/catch block. The inner catch is part of the test.
 */
try {
  prologue();
  try {
    main();
  } catch (e) {
    error(e);
  }
} catch (e) {
  console.error(e);
}
