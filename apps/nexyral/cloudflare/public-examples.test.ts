import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateExample} from './public-examples.ts';
const source={html:'<main><h1>Working app</h1><button>Reset</button></main>',css:'',js:'document.querySelector("button").addEventListener("click",()=>{});'};
test('generated example validation accepts standalone code and rejects unsupported capabilities',()=>{
 assert.deepEqual(validateExample(source),source);
 for(const html of ['<script>alert(1)</script>','<iframe src="https://evil.example"></iframe>','<main onclick="alert(1)">Untrusted event attribute</main>'])assert.throws(()=>validateExample({...source,html}));
 for(const js of ['fetch("https://evil.example")','window.parent.location="https://evil.example"','localStorage.setItem("key","value")'])assert.throws(()=>validateExample({...source,js}));
 assert.throws(()=>validateExample({...source,css:'x'.repeat(40001)}));
});
