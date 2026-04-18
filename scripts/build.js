const { buildSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const extDistDir = path.join(distDir, 'extension');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(extDistDir)) fs.mkdirSync(extDistDir, { recursive: true });

const target = process.env.TARGET;
let ok = true;

// --- Userscript build ---
if (!target || target === 'userscript') {
    const banner = fs.readFileSync(path.join(root, 'src', 'meta.txt'), 'utf-8');
    try {
        const result = buildSync({
            entryPoints: [path.join(root, 'src', 'main.js')],
            bundle: true,
            format: 'iife',
            outfile: path.join(root, 'primer-pp.user.js'),
            banner: { js: banner },
            target: 'es2020',
            charset: 'utf8',
            logLevel: 'info',
        });
        if (result.errors.length > 0) { ok = false; }
        else { console.log('✓ Userscript: primer-pp.user.js'); }
    } catch (e) {
        console.error('Userscript build failed:', e.message);
        ok = false;
    }
}

// --- Extension build ---
// Strategy: bundle polyfill + main separately as IIFE, then concatenate inside
// an async IIFE wrapper so polyfill can await chrome.storage.local.get() before
// main.js runs. IIFE format keeps each bundle self-contained (no bare `export`
// statements) while still allowing `globalThis.*` assignments to leak across.
if (!target || target === 'extension') {
    try {
        const polyfillResult = buildSync({
            entryPoints: [path.join(root, 'src', 'platforms', 'extension', 'content.js')],
            bundle: true,
            format: 'iife',
            write: false,
            target: 'es2020',
            charset: 'utf8',
            logLevel: 'silent',
        });
        const mainResult = buildSync({
            entryPoints: [path.join(root, 'src', 'main.js')],
            bundle: true,
            format: 'iife',
            write: false,
            target: 'es2020',
            charset: 'utf8',
            logLevel: 'silent',
        });

        if (polyfillResult.errors.length > 0 || mainResult.errors.length > 0) {
            ok = false;
        } else {
            const polyfillCode = new TextDecoder().decode(polyfillResult.outputFiles[0].contents);
            const mainCode = new TextDecoder().decode(mainResult.outputFiles[0].contents);
            const combined = [
                '(async () => {',
                '// --- GM_* Polyfill ---',
                polyfillCode,
                '// --- Init polyfill (preload chrome.storage) ---',
                'await globalThis.__initGMPolyfill();',
                '// --- Main Application ---',
                mainCode,
                '})();',
            ].join('\n');
            fs.writeFileSync(path.join(extDistDir, 'content.js'), combined, 'utf8');
            console.log('✓ Extension:  dist/extension/content.js');
        }
    } catch (e) {
        console.error('Extension build failed:', e.message);
        ok = false;
    }

    const extSrcDir = path.join(root, 'src', 'platforms', 'extension');
    for (const file of ['manifest.json', 'background.js']) {
        fs.copyFileSync(path.join(extSrcDir, file), path.join(extDistDir, file));
    }

    const iconsSrc = path.join(extSrcDir, 'icons');
    const iconsDst = path.join(extDistDir, 'icons');
    if (fs.existsSync(iconsSrc)) {
        if (!fs.existsSync(iconsDst)) fs.mkdirSync(iconsDst, { recursive: true });
        for (const f of fs.readdirSync(iconsSrc)) {
            fs.copyFileSync(path.join(iconsSrc, f), path.join(iconsDst, f));
        }
    }
    console.log('✓ Extension assets copied');
}

if (!ok) {
    console.error('Build completed with errors.');
    process.exit(1);
}
