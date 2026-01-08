import process from 'process';
import { Buffer } from 'buffer';

if (!('process' in globalThis)) {
  (globalThis as typeof globalThis & { process: typeof process }).process = process;
}

if (!('Buffer' in globalThis)) {
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
}

if (!('global' in globalThis)) {
  (globalThis as typeof globalThis & { global: typeof globalThis }).global = globalThis;
}
