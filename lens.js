/* ============================================================
   lens.js — 镜头栏目：程序化生成线稿 + 镜片结构 + BOOM 展开
   数据来自 lenses.json；由 work.html 挂载
   ============================================================ */
(function(){
  function esc(s){
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  /* ---------- 浏览器端 Sobel 线稿化（原图 → 白底黑线） ---------- */
  function toLineArt(img, cb){
    try{
      var maxDim = 560;
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var W = Math.max(3, Math.round(w * scale));
      var H = Math.max(3, Math.round(h * scale));
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      var d = ctx.getImageData(0, 0, W, H);
      var px = d.data;
      var gray = new Float32Array(W * H);
      var i = 0;
      for(var y = 0; y < H; y++){
        for(var x = 0; x < W; x++, i++){
          var o = i * 4;
          gray[i] = 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
        }
      }
      var g = new Float32Array(W * H);
      var maxG = 1;
      for(var y2 = 1; y2 < H - 1; y2++){
        for(var x2 = 1; x2 < W - 1; x2++){
          var idx = y2 * W + x2;
          var gx = -gray[idx - W - 1] - 2 * gray[idx - 1] - gray[idx + W - 1] + gray[idx - W + 1] + 2 * gray[idx + 1] + gray[idx + W + 1];
          var gy = -gray[idx - W - 1] - 2 * gray[idx - W] - gray[idx - W + 1] + gray[idx + W - 1] + 2 * gray[idx + W] + gray[idx + W + 1];
          var v = Math.abs(gx) + Math.abs(gy);
          g[idx] = v;
          if(v > maxG) maxG = v;
        }
      }
      var norm = 255 / maxG * 1.7;
      for(var i2 = 0; i2 < W * H; i2++){
        var v2 = Math.min(255, g[i2] * norm);
        var line = Math.round(255 - v2);
        var o2 = i2 * 4;
        px[o2] = line; px[o2 + 1] = line; px[o2 + 2] = line; px[o2 + 3] = 255;
      }
      ctx.putImageData(d, 0, 0);
      cb(c.toDataURL('image/png'));
    }catch(err){ cb(null); }
  }

  /* ---------- 镜片布局：优先 structure，否则自动生成 ---------- */
  function elementLayout(lens){
    if(lens.structure && lens.structure.length){
      var items = [];
      lens.structure.forEach(function(grp){
        if(grp.type === 'iris'){
          items.push({ iris: true, blades: grp.blades || lens.blades });
        } else {
          var n = Math.max(1, parseInt(grp.elements, 10) || 1);
          for(var k = 0; k < n; k++){
            items.push({
              shape: (grp.type === 'concave') ? 'biconcave' : (grp.type === 'aspherical' ? 'aspherical' : (k === 0 ? 'biconvex' : (k === n - 1 ? 'biconvex' : 'meniscus'))),
              group: grp.label,
              thin: (n > 2 && k === 1),
              aspherical: grp.type === 'aspherical'
            });
          }
        }
      });
      return items;
    }
    var n = Math.max(2, parseInt(lens.elements, 10) || 6);
    var irisAt = Math.round(n * 0.58);
    var items = [];
    for(var i = 0; i < n; i++){
      if(i === irisAt){ items.push({ iris: true }); continue; }
      var before = i < irisAt;
      var shape;
      if(before){ shape = (i % 3 === 1) ? 'meniscus' : 'biconvex'; }
      else { shape = (i % 2 === 0) ? 'biconcave' : 'plano'; }
      items.push({ shape: shape, thin: (i % 3 === 1) });
    }
    return items;
  }

  /* ---------- 镜片结构 SVG（剖面：镜片竖直、曲面朝左右） ---------- */
  function opticsSVG(lens, exploded){
    var items = elementLayout(lens);
    var W = 640, H = 230, axis = 100;
    var left = 70, right = W - 70;

    // 紧凑排列：同组镜片胶合、组间稍大间距，整体居中
    var pos = [];
    var x = left;
    var prevGroup = null;
    items.forEach(function(it, i){
      var w = it.iris ? 28 : (it.thin ? 15 : 21);
      if(i > 0){
        var gap = 5;
        if(it.iris) gap = 12;
        else if(it.group && prevGroup !== it.group) gap = 16;
        x += gap;
      }
      pos.push({ cx: x + w / 2 });
      x += w;
      prevGroup = it.group || null;
    });
    var totalW = x - left;
    var offset = ((right - left) - totalW) / 2;
    pos.forEach(function(p){ p.cx += offset; });

    var Dh = 46; // 镜片高度（直径）
    var top = axis - Dh / 2, bot = axis + Dh / 2;
    var parts = [];
    var labels = [];

    items.forEach(function(it, i){
      var cx = pos[i].cx;
      if(it.iris){
        var g = 9;
        parts.push('<g class="el el-iris" data-x="' + cx + '">' +
          '<path d="M ' + cx + ' ' + (axis - 27) + ' L ' + (cx + g) + ' ' + axis + ' L ' + cx + ' ' + (axis + 27) + ' L ' + (cx - g) + ' ' + axis + ' Z"/>' +
          '<path d="M ' + cx + ' ' + (axis - 16) + ' L ' + (cx - 7) + ' ' + axis + ' L ' + cx + ' ' + (axis + 16) + ' L ' + (cx + 7) + ' ' + axis + ' Z"/>' +
          '</g>');
        labels.push({ cx: cx, y: axis - 36, text: '光圈 ' + (lens.blades || 7) + ' 片', isIris: true });
        return;
      }
      var ct = it.thin ? 5 : 8;
      var lArc, rArc;
      switch(it.shape){
        case 'biconvex':
          lArc = 'M ' + cx + ' ' + top + ' Q ' + (cx - ct) + ' ' + axis + ' ' + cx + ' ' + bot;
          rArc = 'M ' + cx + ' ' + top + ' Q ' + (cx + ct) + ' ' + axis + ' ' + cx + ' ' + bot;
          break;
        case 'biconcave':
          lArc = 'M ' + cx + ' ' + top + ' Q ' + (cx + ct) + ' ' + axis + ' ' + cx + ' ' + bot;
          rArc = 'M ' + cx + ' ' + top + ' Q ' + (cx - ct) + ' ' + axis + ' ' + cx + ' ' + bot;
          break;
        case 'meniscus':
          lArc = 'M ' + cx + ' ' + top + ' Q ' + (cx - ct) + ' ' + axis + ' ' + cx + ' ' + bot;
          rArc = 'M ' + cx + ' ' + top + ' Q ' + (cx - ct * 0.5) + ' ' + axis + ' ' + cx + ' ' + bot;
          break;
        case 'aspherical':
          lArc = 'M ' + cx + ' ' + top + ' Q ' + (cx - ct) + ' ' + axis + ' ' + cx + ' ' + bot;
          rArc = 'M ' + cx + ' ' + top + ' Q ' + (cx + ct * 0.7) + ' ' + axis + ' ' + cx + ' ' + bot;
          break;
        default: // plano
          lArc = 'M ' + cx + ' ' + top + ' L ' + cx + ' ' + bot;
          rArc = 'M ' + cx + ' ' + top + ' Q ' + (cx + ct) + ' ' + axis + ' ' + cx + ' ' + bot;
          break;
      }
      var cls = 'el ' + (it.shape === 'biconcave' ? 'el-cc' : 'el-cx') + (it.aspherical ? ' el-asp' : '') + (it.thin ? ' el-thin' : '');
      parts.push('<g class="' + cls + '" data-x="' + cx + '">' +
        '<path d="' + lArc + '" class="lens-curve"/>' +
        '<path d="' + rArc + '" class="lens-curve"/>' +
        '</g>');
    });

    // 前组 / 后组标注
    labels.push({ cx: pos[0].cx + 10, y: axis - 52, text: '前组' });
    labels.push({ cx: pos[pos.length - 1].cx - 10, y: axis + 60, text: '后组' });

    // 特殊镜片 / 技术标注（来自 lenses.json 的 special）
    var specials = lens.special || [];
    specials.forEach(function(sp, si){
      var idx = si % 2 === 0 ? 1 : (items.length - 2);
      var cx = pos[idx].cx;
      var y = (si % 2 === 0) ? (axis - 66) : (axis + 66);
      labels.push({ cx: cx, y: y, text: sp, special: true });
    });

    var labelHTML = labels.map(function(lb){
      var y1;
      if(lb.isIris){ y1 = axis; }
      else if(lb.y < axis){ y1 = top; }
      else { y1 = bot; }
      return '<line x1="' + lb.cx + '" y1="' + y1 + '" x2="' + lb.cx + '" y2="' + (lb.y < axis ? lb.y + 7 : lb.y - 7) + '" class="lens-label-line"/>' +
        '<text x="' + lb.cx + '" y="' + lb.y + '" class="lens-label' + (lb.special ? ' lens-label-special' : '') + '" text-anchor="middle">' + lb.text + '</text>';
    }).join('');

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="optics-svg" preserveAspectRatio="xMidYMid meet">' +
      '<line x1="' + left + '" y1="' + axis + '" x2="' + right + '" y2="' + axis + '" class="lens-axis"/>' +
      parts.join('') +
      labelHTML +
      '</svg>';
  }

  /* ---------- 线稿 SVG（第一眼：镜头侧视轮廓） ---------- */
  function lineArtSVG(lens){
    var W = 360, H = 150;
    var zoom = lens.type === 'zoom';
    var macro = lens.type === 'macro';
    // 镜筒轮廓：前端粗、后段收窄
    var body = zoom
      ? 'M 96 34 L 250 34 L 272 58 L 272 92 L 250 116 L 96 116 L 66 92 L 66 58 Z'
      : 'M 130 40 L 250 40 L 268 60 L 268 90 L 250 110 L 130 110 L 104 90 L 104 60 Z';
    var rings = '';
    if(zoom){
      for(var i = 0; i < 3; i++){
        var rx = 140 + i * 26;
        for(var k = 0; k < 5; k++){
          rings += '<line x1="' + rx + '" y1="' + (38 + k * 8) + '" x2="' + rx + '" y2="' + (42 + k * 8) + '" class="lens-ring"/>';
        }
      }
    } else {
      for(var m = 0; m < 6; m++){
        rings += '<line x1="' + (150 + m * 12) + '" y1="' + (40 + (m % 3) * 4) + '" x2="' + (150 + m * 12) + '" y2="' + (48 + (m % 3) * 4) + '" class="lens-ring"/>';
      }
    }
    // 前镜片弧 + 反光
    var front = 'M 66 58 C 60 58 52 66 52 75 C 52 84 60 92 66 92';
    var glare = 'M 58 66 C 57 70 58 74 60 77';
    // 卡口
    var mount = '<rect x="272" y="66" width="16" height="18" class="lens-mount"/>' +
      '<circle cx="278" cy="75" r="2" class="lens-mount-dot"/>';
    if(!zoom){ mount = '<rect x="268" y="66" width="15" height="18" class="lens-mount"/><circle cx="273" cy="75" r="2" class="lens-mount-dot"/>'; }

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="lineart-svg" preserveAspectRatio="xMidYMid meet">' +
      '<line x1="20" y1="75" x2="340" y2="75" class="lens-guide"/>' +
      '<path d="' + body + '" class="lens-body"/>' +
      '<path d="' + front + '" class="lens-front"/>' +
      '<path d="' + glare + '" class="lens-glare"/>' +
      rings +
      mount +
      '<text x="180" y="78" class="lens-focal" text-anchor="middle">' + esc(lens.focal) + '</text>' +
      '<text x="180" y="98" class="lens-aperture" text-anchor="middle">' + esc(lens.aperture) + '</text>' +
      '</svg>';
  }

  /* ---------- 注入样式 ---------- */
  var CSS = '' +
  '.lens-section{ margin-bottom:110px; }' +
  '.lens-section .ls-head{ display:flex; align-items:baseline; gap:16px; padding-bottom:24px; }' +
  '.lens-section .ls-head h2{ font-family:var(--font-display); font-weight:500; font-size:1.5rem; }' +
  '.lens-section .ls-head .ls-note{ font-family:var(--font-mono); font-size:0.68rem; color:var(--steel); letter-spacing:0.05em; }' +
  '.lens-row{ display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:16px; }' +
  '.lens-card{ position:relative; padding:18px 20px 20px; background:var(--white); border:1px solid var(--paper-2); border-radius:10px; cursor:pointer; transition:transform 0.2s ease, box-shadow 0.3s ease, border-color 0.3s ease; }' +
  '.lens-card:hover{ transform:translateY(-3px); box-shadow:0 12px 30px rgba(28,28,27,0.09); border-color:var(--fog); }' +
  '.lens-card .lc-name{ font-family:var(--font-display); font-weight:500; font-size:1.05rem; line-height:1.25; }' +
  '.lens-card .lc-make{ display:block; margin-top:5px; font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.1em; color:var(--steel); text-transform:uppercase; }' +
  '.lens-card .lc-meta{ display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }' +
  '.lens-card .lc-chip{ font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.05em; padding:3px 9px; border-radius:4px; background:var(--paper-2); color:var(--steel); }' +
  '.lens-card .lc-photo{ width:100%; height:auto; margin:8px 0 4px; border-radius:6px; }' +
  '.lens-disclaimer{ margin-top:14px; font-family:var(--font-mono); font-size:0.62rem; color:var(--steel); letter-spacing:0.04em; opacity:0.8; }' +
  '.lineart-svg{ width:100%; height:auto; margin:8px 0 4px; }' +
  '.lineart-svg .lens-body{ fill:none; stroke:var(--ink); stroke-width:1.6; }' +
  '.lineart-svg .lens-front{ fill:none; stroke:var(--ink); stroke-width:1.4; }' +
  '.lineart-svg .lens-glare{ fill:none; stroke:var(--accent-gold); stroke-width:1.2; }' +
  '.lineart-svg .lens-ring{ stroke:var(--steel); stroke-width:1; opacity:0.7; }' +
  '.lineart-svg .lens-mount{ fill:none; stroke:var(--ink); stroke-width:1.4; }' +
  '.lineart-svg .lens-mount-dot{ fill:var(--accent-red); stroke:none; }' +
  '.lineart-svg .lens-guide{ stroke:var(--fog); stroke-width:0.8; stroke-dasharray:3 5; }' +
  '.lineart-svg .lens-focal{ fill:var(--ink); font-family:var(--font-display); font-weight:500; font-size:15px; }' +
  '.lineart-svg .lens-aperture{ fill:var(--steel); font-family:var(--font-mono); font-size:9px; letter-spacing:0.12em; }' +

  '.lens-overlay{ position:fixed; inset:0; z-index:600; background:color-mix(in srgb, var(--paper) 96%, transparent); backdrop-filter:blur(6px); display:none; overflow-y:auto; }' +
  '.lens-overlay.active{ display:block; }' +
  '.lens-overlay .lo-top{ position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:22px 32px; background:color-mix(in srgb, var(--paper) 80%, transparent); backdrop-filter:blur(10px); border-bottom:1px solid var(--paper-2); }' +
  '.lens-overlay .lo-name{ font-family:var(--font-display); font-weight:500; font-size:1.2rem; }' +
  '.lens-overlay .lo-close{ font-family:var(--font-mono); font-size:0.75rem; color:var(--steel); border:1px solid var(--fog); padding:8px 14px; background:transparent; cursor:pointer; transition:border-color 0.25s ease, color 0.25s ease; }' +
  '.lens-overlay .lo-close:hover{ border-color:var(--accent-gold); color:var(--accent-gold); }' +
  '.lens-overlay .lo-inner{ max-width:760px; margin:0 auto; padding:20px 32px 80px; }' +
  '.lens-stage{ position:relative; margin:10px 0 0; }' +
  '.optics-svg{ width:100%; height:auto; }' +
  '.optics-svg .lens-axis{ stroke:var(--fog); stroke-width:0.8; }' +
  '.optics-svg .lens-curve{ fill:none; stroke:var(--ink); stroke-width:1.5; }' +
  '.optics-svg .lens-edge{ stroke:var(--ink); stroke-width:1.2; }' +
  '.optics-svg .el-thin .lens-curve{ stroke:var(--charcoal); stroke-width:1.2; }' +
  '.optics-svg .el-asp .lens-curve{ stroke:var(--accent-gold); }' +
  '.optics-svg .el-iris path{ fill:none; stroke:var(--accent-gold); stroke-width:1.3; }' +
  '.optics-svg .lens-label-line{ stroke:var(--fog); stroke-width:0.8; }' +
  '.optics-svg .lens-label{ fill:var(--steel); font-family:var(--font-mono); font-size:8.5px; letter-spacing:0.08em; }' +
  '.optics-svg .lens-label-special{ fill:var(--accent-red); }' +
  '.optics-svg .el{ transition:transform 0.7s cubic-bezier(0.2,0.8,0.2,1); }' +
  '.optics-svg .el-iris{ transition:transform 0.7s cubic-bezier(0.2,0.8,0.2,1), opacity 0.5s ease; }' +

  '.boom-ring{ position:absolute; left:50%; top:50%; width:20px; height:20px; margin:-10px 0 0 -10px; border:2px solid var(--accent-gold); border-radius:50%; opacity:0; pointer-events:none; }' +
  '.lens-stage.boom .boom-ring{ animation:boomRing 0.55s ease-out; }' +
  '@keyframes boomRing{ 0%{ opacity:0.9; transform:scale(0.4); } 100%{ opacity:0; transform:scale(16); } }' +
  '.lens-stage.boom .optics-svg .el{ opacity:1; }' +
  '.lens-photos{ margin-top:46px; }' +
  '.lens-photos .lp-head{ font-family:var(--font-mono); font-size:0.7rem; letter-spacing:0.1em; color:var(--steel); margin-bottom:16px; text-transform:uppercase; }' +
  '.lens-photos .lp-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:12px; }' +
  '.lens-photos .lp-item{ aspect-ratio:4/3; overflow:hidden; background:var(--paper-2); border-radius:6px; }' +
  '.lens-photos .lp-item img{ width:100%; height:100%; object-fit:cover; }' +
  '.journal{ margin-top:46px; }' +
  '.journal .jn-head{ font-family:var(--font-mono); font-size:0.7rem; letter-spacing:0.1em; color:var(--steel); margin-bottom:20px; text-transform:uppercase; }' +
  '.jn-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(250px,1fr)); gap:24px; }' +
  '.jn-entry{ position:relative; background:color-mix(in srgb, var(--white) 72%, transparent); border:1px solid var(--paper-2); border-radius:4px; padding:14px 14px 18px; box-shadow:0 5px 16px rgba(28,28,27,0.07); transform:rotate(-1.6deg); transition:transform 0.25s ease, box-shadow 0.25s ease; }' +
  '.jn-entry:nth-child(even){ transform:rotate(1.4deg); }' +
  '.jn-entry:nth-child(3n){ transform:rotate(-0.8deg); }' +
  '.jn-entry:hover{ transform:rotate(0deg) translateY(-3px); box-shadow:0 12px 26px rgba(28,28,27,0.12); }' +
  '.jn-entry .jn-photo{ background:var(--paper); padding:9px 9px 36px; border:1px solid var(--paper-2); box-shadow:0 2px 6px rgba(28,28,27,0.06); }' +
  '.jn-entry .jn-photo img{ width:100%; display:block; filter:grayscale(0.12) contrast(1.02); }' +
  '.jn-entry .jn-text{ margin-top:14px; font-family:var(--font-display); font-style:italic; font-weight:300; font-size:0.95rem; line-height:1.7; color:var(--charcoal); }' +
  '.jn-entry .jn-date{ position:absolute; top:-9px; right:12px; font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.06em; color:var(--accent-red); border:1px solid var(--accent-red); border-radius:4px; padding:2px 8px; background:var(--paper); transform:rotate(3deg); }' +
  '.jn-empty{ font-family:var(--font-mono); font-size:0.78rem; color:var(--steel); padding:28px 0; }' +
  '.story{ margin-top:48px; }' +
  '.story .st-head{ display:flex; align-items:baseline; gap:14px; margin-bottom:22px; }' +
  '.story .st-head .st-num{ font-family:var(--font-mono); font-size:0.72rem; color:var(--accent-red); letter-spacing:0.1em; }' +
  '.story .st-head h3{ font-family:var(--font-display); font-weight:500; font-size:1.35rem; }' +
  '.story .st-body{ max-width:620px; }' +
  '.story .st-body p{ font-family:var(--font-display); font-weight:300; font-size:1.06rem; line-height:2.05; color:var(--charcoal); margin-bottom:1.4em; }' +
  '.story .st-body p:first-of-type::first-letter{ float:left; font-size:3.1em; line-height:0.85; padding-right:0.12em; font-weight:500; color:var(--accent-red); }' +
  '.story .st-date{ font-family:var(--font-mono); font-size:0.66rem; letter-spacing:0.1em; color:var(--steel); }' +
  '@media (prefers-reduced-motion:reduce){ .optics-svg .el{ transition:none; } .boom-ring{ display:none; } }';

  var injected = false;
  function ensureCSS(){
    if(injected) return;
    var el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
    injected = true;
  }

  /* ---------- 挂载 ---------- */
  function mount(container){
    ensureCSS();
    fetch('lenses.json?t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(lenses){
        if(!lenses || !lenses.length){
          container.innerHTML = '<div class="empty-state">还没有镜头</div>';
          return;
        }
        container.innerHTML =
          '<div class="ls-head"><h2>镜头</h2><span class="ls-note">点击查看镜片结构</span></div>' +
          '<div class="lens-row">' + lenses.map(function(l){
            var art = l.photo
              ? '<img class="lc-photo" data-raw="' + esc(l.photo) + '" alt="' + esc(l.name) + '">'
              : lineArtSVG(l);
            return '<div class="lens-card" data-id="' + esc(l.id) + '">' +
              art +
              '<div class="lc-name">' + esc(l.name) + '</div>' +
              '<span class="lc-make">' + esc(l.make) + '</span>' +
              '<div class="lc-meta">' +
                '<span class="lc-chip">' + esc(l.focal) + '</span>' +
                '<span class="lc-chip">' + esc(l.aperture) + '</span>' +
                '<span class="lc-chip">' + (l.elements || '') + ' 片 ' + (l.groups || '') + ' 组</span>' +
              '</div></div>';
          }).join('') + '</div>' +
          '<div class="lens-disclaimer">镜头产品图与结构示意版权归 Canon Inc. 所有，本站仅作个人展示与学习用途，非商业使用。</div>';

        container.querySelectorAll('img.lc-photo[data-raw]').forEach(function(img){
          var raw = img.getAttribute('data-raw');
          if(!raw){ return; }
          if(raw.indexOf('_line') !== -1 || raw.indexOf('line') !== -1){
            img.src = raw;
            img.removeAttribute('data-raw');
            return;
          }
          var tmp = new Image();
          tmp.onload = function(){
            toLineArt(tmp, function(dataUrl){
              if(dataUrl){ img.src = dataUrl; } else { img.src = raw; }
              img.removeAttribute('data-raw');
            });
          };
          tmp.onerror = function(){ img.src = raw; img.removeAttribute('data-raw'); };
          tmp.src = raw;
        });

        container.querySelectorAll('.lens-card').forEach(function(card){
          card.addEventListener('click', function(){
            var id = card.getAttribute('data-id');
            var lens = null;
            for(var i = 0; i < lenses.length; i++){ if(String(lenses[i].id) === id){ lens = lenses[i]; break; } }
            if(lens) openOverlay(lens);
          });
        });
      })
      .catch(function(){
        container.innerHTML = '<div class="empty-state">镜头数据加载失败，检查 lenses.json。</div>';
      });
  }

  /* ---------- 详情 overlay + BOOM ---------- */
  function openOverlay(lens){
    ensureCSS();
    var ov = document.getElementById('lens-overlay');
    if(!ov){
      ov = document.createElement('div');
      ov.className = 'lens-overlay';
      ov.id = 'lens-overlay';
      document.body.appendChild(ov);
    }
    var storyHtml = '';
    if(lens.story && (lens.story.body || lens.story.title)){
      var paras = String(lens.story.body || '').split(/\n+/).filter(function(s){ return s.trim(); }).map(function(p){ return '<p>' + esc(p) + '</p>'; }).join('');
      storyHtml = '<div class="story">' +
        '<div class="st-head"><span class="st-num">STORY</span><h3>' + esc(lens.story.title || '我与这枚镜头') + '</h3></div>' +
        '<div class="st-body">' + paras + '</div>' +
        (lens.story.date ? '<div class="st-date">' + esc(lens.story.date) + '</div>' : '') +
        '</div>';
    }
    ov.innerHTML =
      '<div class="lo-top"><div class="lo-name">' + esc(lens.name) + '</div>' +
      '<button class="lo-close" type="button">关闭</button></div>' +
      '<div class="lo-inner">' +
        '<div class="lens-stage" id="lens-stage"><div class="boom-ring"></div>' + opticsSVG(lens) + '</div>' +
        storyHtml +
        '<div class="journal"><div class="jn-head">手账 · ' + esc(lens.focal) + '</div>' +
          (lens.journal && lens.journal.length
            ? '<div class="jn-grid">' + lens.journal.map(function(j){
                return '<div class="jn-entry">' +
                  '<div class="jn-photo"><img src="' + esc(j.photo) + '" alt="' + esc(j.text || '') + '" loading="lazy"></div>' +
                  '<div class="jn-text">' + esc(j.text || '') + '</div>' +
                  '<span class="jn-date">' + esc(j.date || '') + '</span>' +
                '</div>';
              }).join('') + '</div>'
            : '<div class="jn-empty">这本手账还没有内容</div>') +
        '</div>' +
        '<div class="lens-disclaimer">镜头产品图与镜片结构示意版权归 Canon Inc. 所有，本站仅作个人展示与学习用途，非商业使用。</div>' +
      '</div>';
    ov.classList.add('active');
    document.body.style.overflow = 'hidden';

    ov.querySelector('.lo-close').addEventListener('click', closeOverlay);
    ov.addEventListener('click', function(e){ if(e.target === ov) closeOverlay(); });
    document.addEventListener('keydown', function h(e){
      if(e.key === 'Escape'){ closeOverlay(); document.removeEventListener('keydown', h); }
    });

    // BOOM：镜片从中心展开
    var stage = document.getElementById('lens-stage');
    var els = stage.querySelectorAll('.el');
    var svg = stage.querySelector('.optics-svg');
    var rect = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var scaleX = rect.width / vb.width;
    var centerX = vb.width / 2;

    els.forEach(function(g){
      var x = parseFloat(g.getAttribute('data-x'));
      var dx = centerX - x;
      g.style.transform = 'translateX(' + dx + 'px)';
      g.style.opacity = '0';
    });

    setTimeout(function(){
      stage.classList.add('boom');
      els.forEach(function(g, i){
        g.style.transitionDelay = (i * 0.03) + 's';
        g.style.transform = 'translateX(0px)';
        g.style.opacity = '1';
      });
    }, 60);
  }

  function closeOverlay(){
    var ov = document.getElementById('lens-overlay');
    if(ov) ov.classList.remove('active');
    document.body.style.overflow = '';
  }

  ensureCSS();
  window.LENS_UI = { mount: mount, opticsSVG: opticsSVG };
})();
