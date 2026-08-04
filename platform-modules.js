/* ============================================================
   platform-modules.js — Platform 档案模块注册表
   每个模块：{ key, title, init(el, album) }
   档案在 albums.json 中声明 "modules": ["gacha", ...] 即启用
   ============================================================ */
(function(){
  var NS = window.PLATFORM_MODULES = {};

  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }
  function storeKey(prefix, albumId){ return prefix + '_' + albumId; }
  function load(key, fallback){
    try{
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    }catch(err){ return fallback; }
  }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function today(){
    var d = new Date();
    var m = String(d.getMonth() + 1); var day = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
  }
  function downloadJSON(filename, data){
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 300);
  }
  function injectCSS(css){
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  var MODULE_CSS = '' +
  '.pm-block{ margin-top:58px; }' +
  '.pm-block-head{ display:flex; align-items:baseline; gap:14px; padding-bottom:16px; }' +
  '.pm-block-head .pm-num{ font-family:var(--font-mono); font-size:0.72rem; color:var(--av-accent, var(--accent-red)); letter-spacing:0.1em; }' +
  '.pm-block-head h2{ font-family:var(--font-display); font-weight:500; font-size:1.4rem; }' +
  '.pm-body{ position:relative; padding-top:24px; }' +
  '.pm-body::before{ content:\'\'; position:absolute; top:0; left:0; right:0; height:1px; ' +
    'background:linear-gradient(90deg, transparent 0%, var(--fog) 6%, var(--fog) 94%, transparent 100%); }' +
  '.pm-tools{ display:flex; gap:10px; flex-wrap:wrap; margin-top:20px; }' +
  '.pm-btn{ padding:8px 16px; background:transparent; border:1px solid var(--fog); border-radius:20px; ' +
    'font-family:var(--font-mono); font-size:0.68rem; letter-spacing:0.06em; color:var(--charcoal); cursor:pointer; transition:border-color 0.25s ease, color 0.25s ease; }' +
  '.pm-btn:hover{ border-color:var(--av-accent, var(--accent-red)); color:var(--av-accent, var(--accent-red)); }' +
  '.pm-input, .pm-select{ padding:8px 10px; border:1px solid var(--fog); border-radius:6px; background:var(--white); ' +
    'font-family:var(--font-body); font-size:0.85rem; color:var(--ink); outline:none; transition:border-color 0.25s ease; }' +
  '.pm-input:focus, .pm-select:focus{ border-color:var(--av-accent, var(--accent-red)); }' +
  '.pm-label{ display:block; font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.08em; color:var(--steel); margin-bottom:6px; }' +
  '.pm-hint{ font-family:var(--font-mono); font-size:0.66rem; color:var(--steel); margin-top:10px; }' +

  /* ---- 抽卡统计 ---- */
  '.gacha-stats{ display:flex; gap:16px; flex-wrap:wrap; }' +
  '.gacha-stat{ flex:1; min-width:110px; padding:16px 18px; background:var(--white); border:1px solid var(--paper-2); border-radius:10px; }' +
  '.gacha-stat .gs-num{ font-family:var(--font-display); font-weight:500; font-size:1.7rem; line-height:1.1; }' +
  '.gacha-stat .gs-label{ display:block; margin-top:6px; font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.1em; color:var(--steel); text-transform:uppercase; }' +
  '.gacha-stat.six .gs-num{ color:var(--av-accent, var(--accent-red)); }' +
  '.gacha-pity{ margin-top:22px; }' +
  '.gacha-pity .gp-head{ display:flex; justify-content:space-between; align-items:baseline; font-family:var(--font-mono); font-size:0.7rem; color:var(--steel); letter-spacing:0.05em; margin-bottom:10px; }' +
  '.gacha-pity .gp-bar{ height:6px; border-radius:3px; background:var(--paper-2); overflow:hidden; }' +
  '.gacha-pity .gp-fill{ height:100%; border-radius:3px; background:var(--av-accent, var(--accent-gold)); transition:width 0.4s ease; }' +
  '.gacha-pity.warm .gp-fill{ background:var(--accent-red); }' +
  '.gacha-form{ margin-top:26px; padding:20px 22px; background:var(--white); border:1px solid var(--paper-2); border-radius:10px; }' +
  '.gacha-form .gf-row{ display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; }' +
  '.gacha-form .gf-field{ display:flex; flex-direction:column; gap:6px; }' +
  '.gacha-form .gf-date{ width:130px; } .gacha-form .gf-pool{ width:170px; } .gacha-form .gf-pulls{ width:90px; } .gacha-form .gf-rarity{ width:110px; } .gacha-form .gf-char{ width:150px; }' +
  '.gacha-list{ margin-top:26px; }' +
  '.gacha-row{ position:relative; display:grid; grid-template-columns:96px 1fr auto auto auto 22px; gap:14px; align-items:baseline; padding:13px 0; }' +
  '.gacha-row::after{ content:\'\'; position:absolute; left:0; right:0; bottom:0; height:1px; background:var(--paper-2); }' +
  '.gacha-row .gr-date{ font-family:var(--font-mono); font-size:0.68rem; color:var(--steel); }' +
  '.gacha-row .gr-pool{ font-size:0.9rem; color:var(--charcoal); }' +
  '.gacha-row .gr-pulls{ font-family:var(--font-mono); font-size:0.72rem; color:var(--steel); }' +
  '.gacha-row .gr-rarity{ font-family:var(--font-mono); font-size:0.62rem; padding:3px 9px; border-radius:4px; background:var(--paper-2); color:var(--steel); letter-spacing:0.06em; }' +
  '.gacha-row .gr-rarity.six{ background:var(--accent-red); color:#faf9f6; }' +
  '.gacha-row .gr-rarity.five{ background:var(--accent-gold); color:#1c1c1b; }' +
  '.gacha-row .gr-char{ font-size:0.85rem; color:var(--ink); }' +
  '.gacha-row .gr-del{ background:none; border:none; cursor:pointer; color:var(--steel); font-family:var(--font-mono); font-size:0.8rem; padding:0; transition:color 0.2s ease; }' +
  '.gacha-row .gr-del:hover{ color:var(--accent-red); }' +

  /* ---- 游戏箱 ---- */
  '.gb-tabs{ display:flex; gap:8px; margin-bottom:20px; }' +
  '.gb-tabs button{ padding:6px 14px; background:transparent; border:1px solid var(--fog); border-radius:16px; ' +
    'font-family:var(--font-mono); font-size:0.66rem; letter-spacing:0.06em; color:var(--steel); cursor:pointer; transition:border-color 0.25s ease, color 0.25s ease; }' +
  '.gb-tabs button.on{ border-color:var(--av-accent, var(--accent-red)); color:var(--av-accent, var(--accent-red)); }' +
  '.gb-form{ padding:20px 22px; background:var(--white); border:1px solid var(--paper-2); border-radius:10px; }' +
  '.gb-form .gf-row{ display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; }' +
  '.gb-form .gf-field{ display:flex; flex-direction:column; gap:6px; }' +
  '.gb-form .gb-name{ width:170px; } .gb-form .gb-plat{ width:110px; } .gb-form .gb-status{ width:110px; } .gb-form .gb-rating{ width:80px; } .gb-form .gb-note{ width:220px; }' +
  '.gb-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:14px; margin-top:24px; }' +
  '.gb-card{ position:relative; padding:18px 20px; background:var(--white); border:1px solid var(--paper-2); border-radius:10px; transition:transform 0.2s ease, box-shadow 0.3s ease; }' +
  '.gb-card:hover{ transform:translateY(-2px); box-shadow:0 10px 24px rgba(28,28,27,0.08); }' +
  '.gb-card .gb-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }' +
  '.gb-card .gb-name{ font-family:var(--font-display); font-weight:500; font-size:1.15rem; line-height:1.2; }' +
  '.gb-card .gb-stars{ display:inline-flex; gap:1px; flex-shrink:0; }' +
  '.gb-card .gb-star{ color:var(--fog); display:inline-flex; }' +
  '.gb-card .gb-star.on{ color:var(--accent-gold); }' +
  '.gb-card .gb-meta{ display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }' +
  '.gb-chip{ font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.05em; padding:3px 9px; border-radius:4px; background:var(--paper-2); color:var(--steel); }' +
  '.gb-chip.st-play{ background:var(--accent-gold); color:#1c1c1b; }' +
  '.gb-chip.st-done{ background:var(--accent-cobalt); color:#faf9f6; }' +
  '.gb-chip.st-wish{ background:var(--accent-red); color:#faf9f6; }' +
  '.gb-card .gb-note{ margin-top:10px; font-size:0.82rem; color:var(--steel); line-height:1.6; }' +
  '.gb-card .gb-actions{ display:flex; gap:14px; margin-top:14px; }' +
  '.gb-card .gb-edit, .gb-card .gb-del{ background:none; border:none; padding:0; cursor:pointer; ' +
    'font-family:var(--font-mono); font-size:0.68rem; color:var(--steel); transition:color 0.2s ease; }' +
  '.gb-card .gb-edit:hover{ color:var(--av-accent, var(--accent-red)); }' +
  '.gb-card .gb-del:hover{ color:var(--accent-red); }' +
  '.pm-empty{ font-family:var(--font-mono); font-size:0.78rem; color:var(--steel); padding:26px 0; }';

  injectCSS(MODULE_CSS);

  /* ============================================================
     抽卡统计模块
     ============================================================ */
  NS.gacha = {
    key: 'gacha',
    title: '抽卡统计',
    init: function(el, album){
      var key = storeKey('platform_gacha', album.id);
      var fallback = { settings: { pity: 70 }, records: [] };
      var state = null;
      try{
        var v = localStorage.getItem(key);
        if(v){ state = JSON.parse(v); }
      }catch(err){}
      if(state){ build(); }
      else{
        fetch('platform-data/gacha_' + album.id + '.json', { cache: 'no-store' })
          .then(function(r){ return r.ok ? r.json() : null; })
          .catch(function(){ return null; })
          .then(function(data){
            state = (data && data.records) ? data : fallback;
            build();
          });
      }

      function build(){

      function pityCount(){
        var count = 0;
        for(var i = state.records.length - 1; i >= 0; i--){
          var r = state.records[i];
          if(r.rarity === 'six') break;
          count += (parseInt(r.pulls, 10) || 1);
        }
        return count;
      }
      function saveState(){ save(key, state); }

      function render(){
        var recs = state.records;
        var total = 0, six = 0, five = 0;
        recs.forEach(function(r){
          var n = parseInt(r.pulls, 10) || 1;
          total += n;
          if(r.rarity === 'six') six++;
          else if(r.rarity === 'five') five++;
        });
        var rate = total ? (six / total * 100) : 0;
        var pc = pityCount();
        var pity = parseInt(state.settings.pity, 10) || 70;
        var left = Math.max(0, pity - pc);
        var pct = Math.min(100, pc / pity * 100);
        var warm = pc >= pity - 10 && pc > 0;

        var rows = recs.slice().reverse().map(function(r, i){
          var idx = recs.length - 1 - i;
          return '<div class="gacha-row">' +
            '<span class="gr-date">' + esc(r.date || '') + '</span>' +
            '<span class="gr-pool">' + esc(r.pool || '') + '</span>' +
            '<span class="gr-pulls">+' + (esc(String(r.pulls)) || '1') + '</span>' +
            '<span class="gr-rarity ' + esc(r.rarity || 'none') + '">' +
              (r.rarity === 'six' ? '六星' : r.rarity === 'five' ? '五星' : '未出') + '</span>' +
            '<span class="gr-char">' + esc(r.char || '') + '</span>' +
            '<button class="gr-del" type="button" title="删除" data-i="' + idx + '">×</button>' +
            '</div>';
        }).join('');

        el.innerHTML =
          '<div class="gacha-stats">' +
            '<div class="gacha-stat"><span class="gs-num">' + total + '</span><span class="gs-label">总抽数</span></div>' +
            '<div class="gacha-stat six"><span class="gs-num">' + six + '</span><span class="gs-label">六星</span></div>' +
            '<div class="gacha-stat"><span class="gs-num">' + rate.toFixed(1) + '%</span><span class="gs-label">出金率</span></div>' +
            '<div class="gacha-stat"><span class="gs-num">' + pc + '</span><span class="gs-label">当前保底计数</span></div>' +
          '</div>' +
          '<div class="gacha-pity' + (warm ? ' warm' : '') + '">' +
            '<div class="gp-head"><span>距上次六星已 ' + pc + ' 抽</span><span>距保底还剩 ' + left + ' 抽</span></div>' +
            '<div class="gp-bar"><div class="gp-fill" style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<div class="gacha-form">' +
            '<div class="gf-row">' +
              '<div class="gf-field"><label class="pm-label">日期</label><input class="pm-input gf-date" id="gf-date" type="date" value="' + today() + '"></div>' +
              '<div class="gf-field"><label class="pm-label">卡池</label><input class="pm-input gf-pool" id="gf-pool" type="text" placeholder="如：朔日手记"></div>' +
              '<div class="gf-field"><label class="pm-label">抽数</label><input class="pm-input gf-pulls" id="gf-pulls" type="number" min="1" max="999" value="1"></div>' +
              '<div class="gf-field"><label class="pm-label">结果</label><select class="pm-select gf-rarity" id="gf-rarity">' +
                '<option value="none">未出</option><option value="five">五星</option><option value="six">六星</option></select></div>' +
              '<div class="gf-field"><label class="pm-label">获得</label><input class="pm-input gf-char" id="gf-char" type="text" placeholder="角色名（可选）"></div>' +
              '<div class="gf-field"><button class="pm-btn" id="gf-add" type="button">＋ 记录</button></div>' +
            '</div>' +
          '</div>' +
          '<div class="gacha-list">' + (rows || '<div class="pm-empty">还没有抽卡记录</div>') + '</div>' +
          '<div class="pm-tools">' +
            '<button class="pm-btn" id="gx-export" type="button">导出 JSON</button>' +
            '<button class="pm-btn" id="gx-import" type="button">导入 JSON</button>' +
            '<input type="file" id="gx-file" accept="application/json" style="display:none">' +
            '<button class="pm-btn" id="gx-clear" type="button">清空记录</button>' +
            '<span class="pm-hint">数据仅保存在本机浏览器</span>' +
          '</div>';

        var addBtn = document.getElementById('gf-add');
        if(addBtn){
          addBtn.addEventListener('click', function(){
            var date = document.getElementById('gf-date').value || today();
            var pool = document.getElementById('gf-pool').value.trim();
            var pulls = Math.max(1, parseInt(document.getElementById('gf-pulls').value, 10) || 1);
            var rarity = document.getElementById('gf-rarity').value;
            var char = document.getElementById('gf-char').value.trim();
            if(!pool) pool = '未命名卡池';
            state.records.push({ date: date, pool: pool, pulls: pulls, rarity: rarity, char: char });
            saveState();
            render();
          });
        }
        el.querySelectorAll('.gr-del').forEach(function(btn){
          btn.addEventListener('click', function(){
            state.records.splice(parseInt(btn.getAttribute('data-i'), 10), 1);
            saveState();
            render();
          });
        });
        var ex = document.getElementById('gx-export');
        if(ex){
          ex.addEventListener('click', function(){ downloadJSON('gacha-' + album.id + '.json', state); });
        }
        var im = document.getElementById('gx-import');
        var fileEl = document.getElementById('gx-file');
        if(im && fileEl){
          im.addEventListener('click', function(){ fileEl.click(); });
          fileEl.addEventListener('change', function(){
            var f = fileEl.files && fileEl.files[0];
            if(!f) return;
            var reader = new FileReader();
            reader.onload = function(){
              try{
                var data = JSON.parse(reader.result);
                if(!data || !data.records) throw new Error('bad');
                if(!data.settings) data.settings = { pity: 70 };
                state = data;
                saveState();
                render();
              }catch(err){ alert('导入失败：不是有效的抽卡数据文件'); }
            };
            reader.readAsText(f);
            fileEl.value = '';
          });
        }
        var cl = document.getElementById('gx-clear');
        if(cl){
          cl.addEventListener('click', function(){
            if(confirm('确定清空全部抽卡记录？')){
              state.records = [];
              saveState();
              render();
            }
          });
        }
      }
        render();
      }
    }
  };

  /* ============================================================
     游戏箱模块
     ============================================================ */
  NS.gamebox = {
    key: 'gamebox',
    title: '游戏箱',
    init: function(el, album){
      var key = storeKey('platform_gamebox', album.id);
      var games = null;
      var filter = 'all';
      var editing = -1;
      try{
        var v = localStorage.getItem(key);
        if(v){ games = JSON.parse(v); }
      }catch(err){}
      if(games){ build(); }
      else{
        fetch('platform-data/gamebox_' + album.id + '.json', { cache: 'no-store' })
          .then(function(r){ return r.ok ? r.json() : null; })
          .catch(function(){ return null; })
          .then(function(data){
            games = Array.isArray(data) ? data : [];
            build();
          });
      }

      function build(){

      function saveGames(){ save(key, games); }

      var STATUS = {
        play: '在玩', done: '通关', sealed: '封存', wish: '想玩'
      };
      var STAR_SVG = '<svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:currentColor;stroke:none"><path d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 18l-6.3 3.4 1.5-7.1L1.8 9.4 9 8.6z"/></svg>';

      function starHTML(rating){
        var n = Math.max(0, Math.min(5, Math.round(parseFloat(rating) || 0)));
        var out = '';
        for(var i = 0; i < 5; i++){
          out += '<span class="gb-star' + (i < n ? ' on' : ' off') + '">' + STAR_SVG + '</span>';
        }
        return out;
      }

      function render(){
        var list = games.filter(function(g){ return filter === 'all' || g.status === filter; });
        var tabs = [['all', '全部']].concat(Object.keys(STATUS).map(function(k){ return [k, STATUS[k]]; }))
          .map(function(t){
            return '<button type="button" data-f="' + t[0] + '"' + (filter === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>';
          }).join('');

        var cards = list.map(function(g, i){
          var gi = games.indexOf(g);
          return '<div class="gb-card">' +
            '<div class="gb-top"><span class="gb-name">' + esc(g.name) + '</span>' +
            (g.rating ? '<span class="gb-stars">' + starHTML(g.rating) + '</span>' : '') + '</div>' +
            '<div class="gb-meta">' +
              (g.platform ? '<span class="gb-chip">' + esc(g.platform) + '</span>' : '') +
              '<span class="gb-chip st-' + esc(g.status || 'play') + '">' + (STATUS[g.status] || '在玩') + '</span>' +
            '</div>' +
            (g.note ? '<div class="gb-note">' + esc(g.note) + '</div>' : '') +
            '<div class="gb-actions">' +
              '<button class="gb-edit" type="button" data-i="' + gi + '">编辑</button>' +
              '<button class="gb-del" type="button" data-i="' + gi + '">删除</button>' +
            '</div></div>';
        }).join('');

        var editingHtml = '';
        if(editing >= 0 && games[editing]){
          var eg = games[editing];
          editingHtml = '<div class="gb-form" style="margin-top:20px;">' +
            '<div class="gf-row">' +
              '<div class="gf-field"><label class="pm-label">名称</label><input class="pm-input gb-name" id="eb-name" value="' + esc(eg.name) + '"></div>' +
              '<div class="gf-field"><label class="pm-label">平台</label><input class="pm-input gb-plat" id="eb-plat" value="' + esc(eg.platform || '') + '"></div>' +
              '<div class="gf-field"><label class="pm-label">状态</label><select class="pm-select gb-status" id="eb-status">' +
                Object.keys(STATUS).map(function(k){
                  return '<option value="' + k + '"' + (eg.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>';
                }).join('') + '</select></div>' +
              '<div class="gf-field"><label class="pm-label">评分</label><select class="pm-select gb-rating" id="eb-rating">' +
                ['', '1', '2', '3', '4', '5'].map(function(v){
                  return '<option value="' + v + '"' + (String(eg.rating) === v ? ' selected' : '') + '>' +
                    (v ? new Array(Number(v) + 1).join('★') : '未评分') + '</option>';
                }).join('') + '</select>' +
              '<div class="gf-field"><label class="pm-label">备注</label><input class="pm-input gb-note" id="eb-note" value="' + esc(eg.note || '') + '"></div>' +
              '<div class="gf-field"><button class="pm-btn" id="eb-save" type="button">保存</button></div>' +
              '<div class="gf-field"><button class="pm-btn" id="eb-cancel" type="button">取消</button></div>' +
            '</div></div>';
        }

        el.innerHTML =
          '<div class="gb-tabs">' + tabs + '</div>' +
          '<div class="gb-form">' +
            '<div class="gf-row">' +
              '<div class="gf-field"><label class="pm-label">名称</label><input class="pm-input gb-name" id="nb-name" type="text" placeholder="游戏名"></div>' +
              '<div class="gf-field"><label class="pm-label">平台</label><input class="pm-input gb-plat" id="nb-plat" type="text" placeholder="PC / PS5"></div>' +
              '<div class="gf-field"><label class="pm-label">状态</label><select class="pm-select gb-status" id="nb-status">' +
                Object.keys(STATUS).map(function(k){ return '<option value="' + k + '">' + STATUS[k] + '</option>'; }).join('') + '</select></div>' +
              '<div class="gf-field"><label class="pm-label">评分</label><select class="pm-select gb-rating" id="nb-rating">' +
                '<option value="">未评分</option><option value="1">★</option><option value="2">★★</option><option value="3">★★★</option><option value="4">★★★★</option><option value="5">★★★★★</option>' +
                '</select></div>' +
              '<div class="gf-field"><label class="pm-label">备注</label><input class="pm-input gb-note" id="nb-note" type="text" placeholder="可选"></div>' +
              '<div class="gf-field"><button class="pm-btn" id="nb-add" type="button">＋ 添加</button></div>' +
            '</div>' +
          '</div>' +
          editingHtml +
          '<div class="gb-grid">' + (cards || '<div class="pm-empty">这个箱子里还没有游戏</div>') + '</div>' +
          '<div class="pm-tools">' +
            '<button class="pm-btn" id="gb-export" type="button">导出 JSON</button>' +
            '<button class="pm-btn" id="gb-import" type="button">导入 JSON</button>' +
            '<input type="file" id="gb-file" accept="application/json" style="display:none">' +
            '<span class="pm-hint">数据仅保存在本机浏览器</span>' +
          '</div>';

        el.querySelectorAll('.gb-tabs button').forEach(function(b){
          b.addEventListener('click', function(){ filter = b.getAttribute('data-f'); render(); });
        });
        var addBtn = document.getElementById('nb-add');
        if(addBtn){
          addBtn.addEventListener('click', function(){
            var name = document.getElementById('nb-name').value.trim();
            if(!name) return;
            games.push({
              name: name,
              platform: document.getElementById('nb-plat').value.trim(),
              status: document.getElementById('nb-status').value,
              rating: document.getElementById('nb-rating').value.trim(),
              note: document.getElementById('nb-note').value.trim()
            });
            saveGames();
            render();
          });
        }
        var saveBtn = document.getElementById('eb-save');
        if(saveBtn){
          saveBtn.addEventListener('click', function(){
            var g = games[editing];
            if(!g) return;
            g.name = document.getElementById('eb-name').value.trim() || g.name;
            g.platform = document.getElementById('eb-plat').value.trim();
            g.status = document.getElementById('eb-status').value;
            g.rating = document.getElementById('eb-rating').value.trim();
            g.note = document.getElementById('eb-note').value.trim();
            saveGames();
            editing = -1;
            render();
          });
        }
        var cancelBtn = document.getElementById('eb-cancel');
        if(cancelBtn){
          cancelBtn.addEventListener('click', function(){ editing = -1; render(); });
        }
        el.querySelectorAll('.gb-edit').forEach(function(b){
          b.addEventListener('click', function(){ editing = parseInt(b.getAttribute('data-i'), 10); render(); });
        });
        el.querySelectorAll('.gb-del').forEach(function(b){
          b.addEventListener('click', function(){
            var gi = parseInt(b.getAttribute('data-i'), 10);
            if(confirm('删除「' + games[gi].name + '」？')){
              games.splice(gi, 1);
              if(editing === gi) editing = -1;
              saveGames();
              render();
            }
          });
        });
        var ex = document.getElementById('gb-export');
        if(ex){
          ex.addEventListener('click', function(){ downloadJSON('gamebox-' + album.id + '.json', games); });
        }
        var im = document.getElementById('gb-import');
        var fileEl = document.getElementById('gb-file');
        if(im && fileEl){
          im.addEventListener('click', function(){ fileEl.click(); });
          fileEl.addEventListener('change', function(){
            var f = fileEl.files && fileEl.files[0];
            if(!f) return;
            var reader = new FileReader();
            reader.onload = function(){
              try{
                var data = JSON.parse(reader.result);
                if(!Array.isArray(data)) throw new Error('bad');
                games = data;
                saveGames();
                render();
              }catch(err){ alert('导入失败：不是有效的游戏箱数据文件'); }
            };
            reader.readAsText(f);
            fileEl.value = '';
          });
        }
      }
        render();
      }
    }
  };
})();
