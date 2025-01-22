(window as any).global = window; // Keep this first

(window as any).process = require('process');
(window as any).Buffer = require('buffer').Buffer;

const stream = require('stream-browserify');
(window as any).stream = stream;
(window as any).process = {
  env: { DEBUG: undefined },
  version: ''
};
import * as buffer from 'buffer';
(window as any).Buffer = buffer.Buffer;

import 'core-js/stable';
import 'core-js/features/reflect';
import 'core-js/stable/reflect';
import 'reflect-metadata';
import 'core-js/proposals/reflect-metadata';
import 'crypto-browserify';
