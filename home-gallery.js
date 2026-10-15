(function(){
  var gallery=document.getElementById('home-gallery');
  var dialog=document.getElementById('home-viewer');
  var opener=null,previousOverflow='';
  function render(photos){
    var available=(photos||[]).filter(function(p){return p&&p.image;});
    gallery.replaceChildren();
    if(!available.length){gallery.textContent='这里还没有照片';return;}
    var first=available.find(function(p){return p.featured===true;})||available.find(function(p){return String(p.id)==='1';})||available[0];
    var second=available.find(function(p){return p!==first&&p.category==='城市';})||available.find(function(p){return p!==first&&p.category!==first.category;})||available.find(function(p){return p!==first;});
    [first,second].filter(Boolean).forEach(function(photo){
      var figure=document.createElement('figure');figure.className='home-print';
      var button=document.createElement('button');button.type='button';button.className='home-photo-open';
      button.setAttribute('aria-label','查看清晰大图：'+(photo.title||'摄影作品'));
      var image=document.createElement('img');image.src=photo.image;image.alt=photo.title||'摄影作品';image.decoding='async';
      button.appendChild(image);
      var caption=document.createElement('figcaption');
      var title=document.createElement('span');title.textContent=photo.title||'摄影作品';
      var detail=document.createElement('span');detail.textContent=[photo.category,photo.date].filter(Boolean).join(' / ');
      caption.append(title,detail);figure.append(button,caption);gallery.appendChild(figure);
      button.addEventListener('click',function(){
        opener=button;previousOverflow=document.body.style.overflow;
        var full=document.createElement('img');full.src=photo.image;full.alt=photo.title||'摄影作品';
        dialog.querySelector('.home-viewer-image').replaceChildren(full);
        dialog.querySelector('p').textContent=[photo.title,photo.date,photo.category].filter(Boolean).join(' · ');
        dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('button').focus();
      });
    });
  }
  if(window.__homepagePhotos)render(window.__homepagePhotos);
  window.addEventListener('portfolio-photos',function(e){render(e.detail);});
  window.addEventListener('portfolio-photos-error',function(){gallery.textContent='照片暂时未能加载，请刷新重试。';});
  dialog.querySelector('button').addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',function(){document.body.style.overflow=previousOverflow;if(opener)opener.focus({preventScroll:true});});
})();
