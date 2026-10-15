// 通用音乐组件：自由拖动圆钮 + 环绕音量环 + 飞出小三角暂停键（全站与档案音乐共用）
window.__createMusicWidget = function(btn, audio, storageKey, onStart, opts){
  opts = opts || {};
  var box = btn ? btn.closest('.music-box') : null;
  if(!box || !audio) return null;

  var stored = null;
  try{ stored = localStorage.getItem(storageKey); }catch(err){}
  var volVal = stored !== null ? parseFloat(stored) : 0.35;
  if(isNaN(volVal)) volVal = 0.35;
  volVal = Math.max(0, Math.min(1, volVal));
  audio.volume = volVal;

  var playing = false;
  var consent = false;
  try{ consent = sessionStorage.getItem('music_opt_in') === '1'; }catch(err){}
  var trackName = '背景音乐';
  var caption = document.createElement('div');
  caption.className = 'music-caption';
  caption.setAttribute('role', 'status');
  box.appendChild(caption);
  function updateStatus(message){
    var action = playing ? '暂停音乐' : '播放音乐';
    btn.setAttribute('aria-label', action + ' · ' + trackName);
    btn.setAttribute('aria-pressed', String(playing));
    btn.title = action + ' · ' + trackName;
    caption.textContent = trackName + ' · ' + (message || (playing ? '正在播放' : '点击播放'));
    var rect = box.getBoundingClientRect();
    caption.style.right = rect.left < innerWidth / 2 ? 'auto' : '0';
    caption.style.left = rect.left < innerWidth / 2 ? '0' : 'auto';
    caption.style.top = rect.top < 100 ? 'calc(100% + 24px)' : 'auto';
    caption.style.bottom = rect.top < 100 ? 'auto' : 'calc(100% + 24px)';
  }
  updateStatus();
  var suppressAuto = false;
  window.__musicWidgets = window.__musicWidgets || [];

  function setOpen(open){ box.classList.toggle('volume-open', open); }

  // ---- 环绕音量环 ----
  var ring = document.createElement('div');
  ring.className = 'volume-ring';
  ring.innerHTML =
    '<svg viewBox="0 0 100 100">' +
      '<circle class="vr-track" cx="50" cy="50" r="46"/>' +
      '<circle class="vr-fill" cx="50" cy="50" r="46"/>' +
    '</svg>' +
    '<div class="vr-thumb"></div>';
  btn.appendChild(ring);

  var svg = ring.querySelector('svg');
  var fill = ring.querySelector('.vr-fill');
  var thumb = ring.querySelector('.vr-thumb');
  var R = 46;
  var C = 2 * Math.PI * R;
  var ringDrag = false;

  function renderVol(v){
    v = Math.max(0, Math.min(1, v));
    var ang = v * 2 * Math.PI;
    thumb.style.left = (50 + R * Math.sin(ang)) + '%';
    thumb.style.top = (50 - R * Math.cos(ang)) + '%';
    fill.style.strokeDasharray = (v * C) + ' ' + C;
    return v;
  }
  function pointToVol(e){
    var rect = svg.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var ang = Math.atan2(e.clientX - cx, -(e.clientY - cy));
    if(ang < 0) ang += Math.PI * 2;
    var MUTE = 0.05;
    if(ang < MUTE) return 0;
    return (ang - MUTE) / (Math.PI * 2 - MUTE);
  }
  function setVol(v){
    v = renderVol(v);
    audio.volume = v;
    try{ localStorage.setItem(storageKey, String(v)); }catch(err){}
  }
  svg.addEventListener('pointerdown', function(e){
    e.preventDefault();
    e.stopPropagation();
    ringDrag = true;
    svg.setPointerCapture(e.pointerId);
    setVol(pointToVol(e));
  });
  svg.addEventListener('pointermove', function(e){
    if(!ringDrag) return;
    e.preventDefault();
    setVol(pointToVol(e));
  });
  function endRing(e){
    if(!ringDrag) return;
    ringDrag = false;
    try{ svg.releasePointerCapture(e.pointerId); }catch(err){}
  }
  svg.addEventListener('pointerup', endRing);
  svg.addEventListener('pointercancel', endRing);
  ring.addEventListener('click', function(e){ e.stopPropagation(); });
  renderVol(volVal);

  // ---- 飞出小三角 ----
  var chip = document.createElement('div');
  chip.className = 'pause-fly';
  btn.appendChild(chip);

  function setChipIcon(playingState){
    chip.innerHTML = playingState
      ? '<svg class="pf-pause" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg class="pf-play" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
  }
  setChipIcon(false);

  function showChip(icon){
    chip.classList.add('on');
    setChipIcon(icon);
  }
  function hideChip(){
    chip.classList.remove('on');
  }
  function resetChip(){
    chip.style.left = '50%';
    chip.style.top = '50%';
    chip.style.transform = '';
  }

  var chipDrag = false;
  var chipMoved = 0;
  var chipSX = 0;
  var chipSY = 0;

  chip.addEventListener('pointerdown', function(e){
    e.preventDefault();
    e.stopPropagation();
    chipDrag = true;
    chipMoved = 0;
    chipSX = e.clientX;
    chipSY = e.clientY;
    try{ chip.setPointerCapture(e.pointerId); }catch(err){}
    chip.classList.add('dragging');
  });
  chip.addEventListener('pointermove', function(e){
    if(!chipDrag) return;
    e.preventDefault();
    e.stopPropagation();
    var dx = e.clientX - chipSX;
    var dy = e.clientY - chipSY;
    var moved = Math.sqrt(dx * dx + dy * dy);
    if(moved > chipMoved) chipMoved = moved;
    var bcr = btn.getBoundingClientRect();
    chip.style.left = (e.clientX - bcr.left) + 'px';
    chip.style.top = (e.clientY - bcr.top) + 'px';
    chip.style.transform = 'translate(-50%,-50%)';
  });
  function chipEnd(e){
    if(!chipDrag) return;
    chipDrag = false;
    try{ chip.releasePointerCapture(e.pointerId); }catch(err){}
    chip.classList.remove('dragging');

    if(chipMoved < 6){
      toggle();
      resetChip();
      return;
    }
    var bcr = btn.getBoundingClientRect();
    var cx = bcr.left + bcr.width / 2;
    var cy = bcr.top + bcr.height / 2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var btnHalf = bcr.width / 2;
    if(dist <= btnHalf + 12){
      setOpen(false);
      chip.classList.add('absorbing');
      setTimeout(function(){
        chip.classList.remove('absorbing');
        hideChip();
        resetChip();
      }, 380);
    } else {
      resetChip();
    }
  }
  chip.addEventListener('pointerup', chipEnd);
  chip.addEventListener('pointercancel', chipEnd);
  chip.addEventListener('click', function(e){ e.stopPropagation(); });

  // ---- 播放控制（可反复暂停/继续，同页音乐互斥） ----
  function start(){
    if(!consent) return;
    if(!audio.paused) return;
    pauseOthers();
    if(onStart){ onStart(); }
    resetChip();
    audio.play().then(function(){
      playing = true;
      btn.classList.add('playing');
      showChip(true);
      updateStatus();
    }).catch(function(){ updateStatus('点击重试播放'); });
  }
  // 手势自动播放：仅在用户未主动暂停时生效
  function startAuto(){
    if(suppressAuto) return;
    start();
  }
  function doStop(){
    audio.pause();
    playing = false;
    btn.classList.remove('playing');
    setOpen(false);
    showChip(false);
    updateStatus('已暂停');
  }
  function stop(){
    suppressAuto = true;
    doStop();
  }
  function toggle(){
    if(playing){
      stop();
    } else {
      consent = true;
      try{ sessionStorage.setItem('music_opt_in', '1'); }catch(err){}
      suppressAuto = false;
      start();
      setOpen(true);
    }
  }
  var api = { start: start, startAuto: startAuto, stop: stop, setSrc: setSrc };
  window.__musicWidgets.push(api);
  function pauseOthers(){
    window.__musicWidgets.forEach(function(w){
      if(w !== api) w.stop();
    });
  }

  // 切曲时的进度恢复（等待元数据加载后定位）
  var pendingSeek = null;
  audio.addEventListener('loadedmetadata', function(){
    if(pendingSeek !== null){
      try{ audio.currentTime = pendingSeek; }catch(err){}
      pendingSeek = null;
    }
  });
  function startWithTime(t){
    if(t !== null && t !== undefined && isFinite(t)){ pendingSeek = t; }
    start();
  }
  function setSrc(url, autoPlay, restoreTime, title){
    if(!url) return;
    trackName = title || (url === 'music/background.mp3' ? '背景音乐' : '档案音乐');
    updateStatus();
    if(url === audio.getAttribute('data-src')){
      if(autoPlay && !playing && audio.paused){ startWithTime(restoreTime); }
      return;
    }
    var wasPlaying = playing;
    doStop();
    audio.setAttribute('data-src', url);
    audio.src = url;
    pendingSeek = null;
    try{ audio.load(); }catch(err){}
    if(autoPlay || wasPlaying){ startWithTime(restoreTime); }
  }

  // ---- 全屏自由拖动（拖动整球到屏幕任意位置） ----
  var isFixed = getComputedStyle(box).position === 'fixed';
  var moveDrag = false;
  var moveMoved = 0;
  var mSX = 0;
  var mSY = 0;
  var bStartL = 0;
  var bStartT = 0;

  btn.addEventListener('pointerdown', function(e){
    e.preventDefault();
    e.stopPropagation();
    moveDrag = true;
    moveMoved = 0;
    mSX = e.clientX;
    mSY = e.clientY;
    var bcr = box.getBoundingClientRect();
    bStartL = bcr.left;
    bStartT = bcr.top;
    try{ btn.setPointerCapture(e.pointerId); }catch(err){}
  });
  btn.addEventListener('pointermove', function(e){
    if(!moveDrag) return;
    e.preventDefault();
    var dx = e.clientX - mSX;
    var dy = e.clientY - mSY;
    var moved = Math.sqrt(dx * dx + dy * dy);
    if(moved > moveMoved) moveMoved = moved;
    var bw = box.offsetWidth;
    var bh = box.offsetHeight;
    var nx = Math.max(8, Math.min(bStartL + dx, window.innerWidth - bw - 8));
    var ny = Math.max(8, Math.min(bStartT + dy, window.innerHeight - bh - 8));
    box.style.left = nx + 'px';
    box.style.top = ny + 'px';
    box.style.right = 'auto';
    box.style.bottom = 'auto';
  });
  function moveEnd(e){
    if(!moveDrag) return;
    moveDrag = false;
    try{ btn.releasePointerCapture(e.pointerId); }catch(err){}
    if(moveMoved < 6){
      toggle();
    } else if(opts.persistPos){
      try{
        localStorage.setItem('music_pos', JSON.stringify({
          x: parseInt(box.style.left, 10),
          y: parseInt(box.style.top, 10)
        }));
      }catch(err){}
    }
  }
  btn.addEventListener('pointerup', moveEnd);
  btn.addEventListener('pointercancel', moveEnd);
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    if(e.detail === 0) toggle();
  });

  function clampPosition(){
    if(!isFixed || !box.style.left) return;
    var rect = box.getBoundingClientRect();
    box.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)) + 'px';
    box.style.top = Math.max(8, Math.min(rect.top, window.innerHeight - rect.height - 8)) + 'px';
    updateStatus();
  }

  if(isFixed && opts.persistPos){
    try{
      var savedPos = JSON.parse(localStorage.getItem('music_pos') || 'null');
      if(savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number'){
        box.style.left = savedPos.x + 'px';
        box.style.top = savedPos.y + 'px';
        box.style.right = 'auto';
        box.style.bottom = 'auto';
      }
    }catch(err){}
    clampPosition();
    window.addEventListener('resize', clampPosition);
  }

  return api;
};

// 全站音乐实例：主动开启、位置/音量记忆、视频页避让与跨页续播。
(function(){
  var btn = document.getElementById('music-toggle');
  var audio = document.getElementById('bg-music');
  if(!btn || !audio) return;

  audio.setAttribute('data-src', 'music/background.mp3');
  audio.preload = 'none';

  var widget = window.__createMusicWidget(btn, audio, 'music_volume', null, { persistPos: true });
  window.__pauseMusic = widget.stop;
  window.__musicWidget = widget;

  // ---- 跨页续播（同一曲目 music/background.mp3 时恢复进度并尝试续播） ----
  var resumeTime = null;
  var wantResume = false;
  try{
    var saved = JSON.parse(sessionStorage.getItem('music_session') || 'null');
    if(saved && typeof saved.time === 'number' && isFinite(saved.time) &&
       saved.src === 'music/background.mp3'){
      resumeTime = saved.time;
      wantResume = !!saved.playing;
    }
  }catch(err){}
  audio.addEventListener('loadedmetadata', function(){
    if(resumeTime !== null){
      try{ audio.currentTime = resumeTime; }catch(err){}
      resumeTime = null;
    }
  });
  function saveSession(){
    try{
      sessionStorage.setItem('music_session', JSON.stringify({
        time: audio.currentTime,
        playing: !audio.paused,
        src: audio.getAttribute('data-src') || 'music/background.mp3'
      }));
    }catch(err){}
  }
  window.addEventListener('pagehide', saveSession);
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden') saveSession();
  });

  // 只有主动开启过音乐的会话才尝试续播；被浏览器阻止时等待音乐按钮。
  var inAlbum = /platform\.html$/.test(location.pathname) && new URLSearchParams(location.search).has('album');
  if(wantResume && !inAlbum){ widget.start(); }
  window.dispatchEvent(new Event('music-ready'));
})();
