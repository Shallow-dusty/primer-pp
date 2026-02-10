import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import css from 'rollup-plugin-import-css';
import copy from 'rollup-plugin-copy';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const target = process.env.TARGET; // 'userscript' | 'extension' | undefined (both)

const banner = `// ==UserScript==
// @name         Gemini Ultra Toolkit (v${pkg.version})
// @namespace    http://tampermonkey.net/
// @version      ${pkg.version}
// @description  Modular Gemini assistant platform — counter, heatmap, quota, folders & more
// @author       ${pkg.author}
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==`;

const userscriptConfig = {
  input: 'src/platforms/userscript/entry.js',
  output: {
    file: 'dist/gemini-ultra-toolkit.user.js',
    format: 'iife',
    banner,
    sourcemap: false,
  },
  plugins: [
    css({ output: false }),   // inline CSS into JS via import
    resolve(),
    commonjs(),
  ],
};

const extensionConfig = {
  input: 'src/platforms/extension/content.js',
  output: {
    file: 'dist/extension/content.js',
    format: 'iife',
    sourcemap: false,
  },
  plugins: [
    css({ output: 'styles.css' }),  // extract CSS to separate file
    resolve(),
    commonjs(),
    copy({
      targets: [
        { src: 'src/platforms/extension/manifest.json', dest: 'dist/extension' },
        { src: 'src/platforms/extension/background.js', dest: 'dist/extension' },
        { src: 'src/platforms/extension/icons', dest: 'dist/extension' },
      ],
    }),
  ],
};

const configs = [];
if (!target || target === 'userscript') configs.push(userscriptConfig);
if (!target || target === 'extension') configs.push(extensionConfig);

export default configs;
