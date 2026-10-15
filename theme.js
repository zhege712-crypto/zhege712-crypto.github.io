/* ============================================================
   theme.js — 伞 / umbrella · shared theme switching logic
   ============================================================ */
(function(){
  var header = document.querySelector('header');
  var panel = document.getElementById('theme-side');
  if(header && panel){
    var themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.className = 'mobile-theme-toggle';
    themeToggle.textContent = '主题';
    themeToggle.setAttribute('aria-expanded', 'false');
    themeToggle.setAttribute('aria-controls', 'theme-side');
    header.querySelector('.wrap').appendChild(themeToggle);
    panel.setAttribute('aria-label', '选择显示主题');
    function closePanel(){ panel.classList.remove('is-open'); themeToggle.setAttribute('aria-expanded', 'false'); }
    themeToggle.addEventListener('click', function(){
      var open = panel.classList.toggle('is-open');
      themeToggle.setAttribute('aria-expanded', String(open));
      if(open) panel.querySelector('.theme-btn.active, .theme-btn').focus();
    });
    document.addEventListener('click', function(e){ if(!panel.contains(e.target) && !themeToggle.contains(e.target)) closePanel(); });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && panel.classList.contains('is-open')){ closePanel(); themeToggle.focus(); }
    });
    header.querySelectorAll('nav a').forEach(function(a){
      if(new URL(a.href).pathname === location.pathname) a.setAttribute('aria-current', 'page');
    });
  }
  var btns = document.querySelectorAll('#theme-side .theme-btn');
  if(!btns.length) return;
  function isNightTime() {
    var hour = new Date().getHours();
    return (hour >= 19 || hour < 6);
  }
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    try{ localStorage.setItem('theme', theme); }catch(err){}
    btns.forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-theme') === theme));
    });
  }
  var saved = null;
  try{ saved = localStorage.getItem('theme'); }catch(err){}
  var initial;
  if (saved && (saved === 'light' || saved === 'dark' || saved === 'eye-care')) {
    initial = saved;
  } else {
    initial = isNightTime() ? 'dark' : 'light';
  }
  applyTheme(initial);
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      applyTheme(this.getAttribute('data-theme'));
    });
  });
})();
