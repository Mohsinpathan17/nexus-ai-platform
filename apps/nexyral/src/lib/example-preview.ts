import type { ExampleSource } from '../../shared/public-examples';
export function previewDocument(source: ExampleSource): string {
  const nonce = crypto.randomUUID();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>*{box-sizing:border-box}body{margin:0;font:16px system-ui;background:#f7f8fa;color:#202631}button,input,select{font:inherit}button{cursor:pointer}:focus-visible{outline:3px solid #4568f0;outline-offset:3px}${source.css.replace(/<\/style/gi,'<\\/style')}</style></head><body>${source.html}<script nonce="${nonce}">${source.js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
}
