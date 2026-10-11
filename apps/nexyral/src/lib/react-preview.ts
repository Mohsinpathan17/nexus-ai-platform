import { transform } from 'sucrase';
import runtime from 'virtual:nexyral-preview-runtime';
import type { ProjectSource } from './project-export';

/** Transpile, never execute, on the trusted page. Execution belongs to the sandbox frame. */
export function reactPreviewDocument(source: ProjectSource, channel: string): string {
  const code = transform(source.app, {
    transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'classic', production: true,
  }).code;
  const nonce = crypto.randomUUID();
  const escapeScript = (text: string) => text.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html><html lang="en" data-channel="${channel}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>*{box-sizing:border-box}body{margin:0;background:#fff;color:#18202f;font:16px system-ui}button,input,textarea,select{font:inherit}:focus-visible{outline:3px solid #546aff;outline-offset:3px}${source.css.replace(/<\/style/gi,'<\\/style')}</style></head><body><div id="root"></div><script nonce="${nonce}">${escapeScript(runtime)}</script><script nonce="${nonce}">try{const exports={};const module={exports};const React=window.NexyralRuntime.react.default;function require(name){if(name==='react')return window.NexyralRuntime.react;if(name==='./styles.css'||name==='./App.css')return {};throw new Error('Preview supports React imports only: '+name);}${escapeScript(code)}\nwindow.NexyralRuntime.mount(module.exports.default);}catch(error){parent.postMessage({type:'nexyral-preview',key:document.documentElement.dataset.channel,state:'error',message:String(error.message||error)},'*');}</script></body></html>`;
}
