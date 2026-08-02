// 访客统计：服务端由不蒜子计数，前端自行渲染（规避其本地缓存累加缺陷）
(function(){
  var box = document.getElementById('counter-box');
  var pvEl = document.getElementById('counter-pv');
  var uvEl = document.getElementById('counter-uv');
  if(!box || !pvEl || !uvEl) return;

  window.__counterCb = function(data){
    if(data && typeof data.site_pv === 'number'){
      pvEl.textContent = data.site_pv;
      uvEl.textContent = data.site_uv;
      box.style.display = 'flex';
    }
  };
  var s = document.createElement('script');
  s.src = 'https://busuanzi.ibruce.info/busuanzi?jsonpCallback=__counterCb&_=' + Date.now();
  s.onerror = function(){};
  document.head.appendChild(s);
})();
