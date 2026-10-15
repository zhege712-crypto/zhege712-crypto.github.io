const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const files = fs.readdirSync(root).filter(name => /\.(html|js)$/.test(name));
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('page scripts have explicit closing tags and valid JavaScript', () => {
  for (const file of files) {
    const source = read(file);
    if (file.endsWith('.js')) {
      assert.doesNotThrow(() => new vm.Script(source, { filename: file }));
      continue;
    }
    for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
      assert.doesNotMatch(match[1], /<script\b/i, `${file}: nested script tag`);
      assert.doesNotThrow(() => new vm.Script(match[1], { filename: file }));
    }
  }
});

// Simulate textContent -> innerHTML: browsers escape markup, but not quotes.
const document = {
  createElement() {
    return {
      textContent: '',
      get innerHTML() {
        return String(this.textContent).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    };
  }
};

test('content escaping protects both text and quoted HTML attributes', () => {
  for (const file of files.filter(f => f !== 'test.html')) {
    for (const match of read(file).matchAll(/function (?:esc|escapeHtml)\(s\)\{([\s\S]*?)\}/g)) {
      const escape = vm.runInNewContext(`(${match[0]})`, { document });
      assert.equal(escape(`"'><img src=x onerror=alert(1)>&`), '&quot;&#39;&gt;&lt;img src=x onerror=alert(1)&gt;&amp;', file);
      assert.equal(escape('中文 & text'), '中文 &amp; text', file);
    }
  }
});

test('content links reject executable URL schemes', () => {
  for (const file of ['index.html', 'about.html', 'memo.html', 'platform.html']) {
    const helper = read(file).match(/function safeLink\(value\)\{[\s\S]*?\n\}/)[0];
    const safeLink = vm.runInNewContext(`(${helper})`, { URL, location: { href: 'https://example.com/' } });
    for (const url of ['javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'java\nscript:alert(1)', 'data:text/html,test']) {
      assert.equal(safeLink(url), '#', file);
    }
    for (const url of ['https://example.com/a', 'mailto:user@example.com', 'writing.html?id=1']) {
      assert.equal(safeLink(url), url, file);
    }
  }
});

test('album deletion stops if migrating its content fails', async () => {
  const source = read('admin.html');
  const deleteFn = source.slice(source.indexOf('async function deleteAlbum(id){'), source.indexOf('// 主题切换', source.indexOf('async function deleteAlbum(id){')));
  const calls = [];
  const statuses = [];
  const file = data => ({ ok: true, json: async () => ({sha:'test-sha',content:Buffer.from(JSON.stringify(data)).toString('base64')}) });
  const context = {
    els: {owner:{value:'owner'},repo:{value:'repo'},token:{value:'test-token'}},
    confirm: () => true,
    setAlManageStatus: (message, type) => statuses.push({message,type}),
    atob, btoa, escape, unescape,
    ghRequest: async (name, options) => {
      calls.push([name,options.method || 'GET']);
      if(name === 'albums.json') return file([{id:'a'}]);
      if(!options.method) return file([{id:'memo',album:'a'}]);
      return {ok:false,status:409};
    }
  };
  vm.createContext(context);
  vm.runInContext(deleteFn,context);
  await context.deleteAlbum('a');
  assert.deepEqual(calls,[['albums.json','GET'],['memos.json','GET'],['memos.json','PUT']]);
  assert.equal(statuses.at(-1).type,'err');
  assert.match(statuses.at(-1).message,/尚未删除/);
});
