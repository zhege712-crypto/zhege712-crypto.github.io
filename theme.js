/* ============================================================
   theme.js — 伞 / umbrella · shared theme switching logic
   ============================================================ */
(function(){
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
    localStorage.setItem('theme', theme);
    btns.forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
  }
  var saved = localStorage.getItem('theme');
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
