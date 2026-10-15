/* Visual-only lens gallery. Data comes from lenses.json. */
(function(){
  function escapeAttribute(value){
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function elementsFor(lens){
    var elements=[];
    if(Array.isArray(lens.structure) && lens.structure.length){
      lens.structure.forEach(function(group,index){
        if(group.type === 'iris'){
          elements.push({iris:true,group:index});
          return;
        }
        var count=Math.max(1,parseInt(group.elements,10)||1);
        for(var i=0;i<count;i++){
          elements.push({
            shape:group.type === 'concave' ? 'concave' : group.type === 'aspherical' ? 'aspherical' : i > 0 && i < count-1 ? 'meniscus' : 'convex',
            thin:count>2 && i===1,
            group:index
          });
        }
      });
    }else{
      var total=Math.max(2,parseInt(lens.elements,10)||6);
      for(var j=0;j<total;j++){
        if(j===Math.round(total*.58)) elements.push({iris:true,group:j});
        else elements.push({shape:j%3===1?'meniscus':'convex',group:j});
      }
    }
    return elements;
  }

  function opticsSVG(lens){
    var items=elementsFor(lens), width=640, height=150, axis=75;
    var x=60, previous=null, positions=[];
    items.forEach(function(item,index){
      var elementWidth=item.iris?28:item.thin?15:21;
      if(index) x+=item.iris?12:item.group!==previous?16:5;
      positions.push(x+elementWidth/2);
      x+=elementWidth;
      previous=item.group;
    });
    var offset=(width-(x-60))/2-60;
    var parts=items.map(function(item,index){
      var cx=positions[index]+offset;
      if(item.iris){
        return '<g class="el-iris"><path d="M '+cx+' 48 L '+(cx+9)+' 75 L '+cx+' 102 L '+(cx-9)+' 75 Z"/>'+
          '<path d="M '+cx+' 59 L '+(cx-7)+' 75 L '+cx+' 91 L '+(cx+7)+' 75 Z"/></g>';
      }
      var top=52,bottom=98, curve=item.thin?5:8;
      var left=item.shape==='concave'?cx+curve:cx-curve;
      var right=item.shape==='concave'?cx-curve:item.shape==='meniscus'?cx-curve*.5:cx+curve;
      return '<g class="el-glass'+(item.shape==='aspherical'?' el-aspherical':'')+'">'+
        '<path d="M '+cx+' '+top+' Q '+left+' '+axis+' '+cx+' '+bottom+'"/>'+
        '<path d="M '+cx+' '+top+' Q '+right+' '+axis+' '+cx+' '+bottom+'"/></g>';
    }).join('');
    return '<svg class="optics-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+escapeAttribute(lens.name||'镜头')+'的镜片结构图">'+
      '<line class="lens-axis" x1="45" y1="75" x2="595" y2="75"/>'+parts+'</svg>';
  }

  function silhouetteSVG(lens){
    var zoom=lens.type==='zoom';
    var body=zoom
      ? 'M 96 34 L 250 34 L 272 58 L 272 92 L 250 116 L 96 116 L 66 92 L 66 58 Z'
      : 'M 130 40 L 250 40 L 268 60 L 268 90 L 250 110 L 130 110 L 104 90 L 104 60 Z';
    var rings='';
    for(var i=0;i<6;i++){
      var ring=zoom?140+i*16:145+i*14;
      rings+='<line class="lens-ring" x1="'+ring+'" y1="42" x2="'+ring+'" y2="108"/>';
    }
    return '<svg class="lens-silhouette" viewBox="0 0 360 150" aria-hidden="true">'+
      '<path class="lens-body" d="'+body+'"/>'+rings+
      '<path class="lens-front" d="M 66 58 C 52 64 52 86 66 92"/>'+
      '<rect class="lens-mount" x="272" y="66" width="16" height="18"/></svg>';
  }

  var CSS=[
    '.lens-section{padding-top:48px;border-top:1px solid var(--paper-2);scroll-margin-top:110px;}',
    '.lens-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;}',
    '.lens-card{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;padding:18px;border:1px solid var(--paper-2);border-radius:10px;background:var(--white);cursor:pointer;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;}',
    '.lens-card:hover{transform:translateY(-3px);border-color:var(--fog);box-shadow:0 12px 30px rgba(28,28,27,.09);}',
    '.lens-card:focus-visible{outline:2px solid var(--accent-cobalt);outline-offset:3px;}',
    '.lens-card img{display:block;width:100%;height:100%;object-fit:contain;background:#fff;}',
    '.lens-silhouette{display:block;width:100%;height:auto;}',
    '.lens-silhouette .lens-body,.lens-silhouette .lens-front,.lens-silhouette .lens-mount{fill:none;stroke:var(--ink);stroke-width:1.5;}',
    '.lens-silhouette .lens-ring{stroke:var(--steel);stroke-width:.7;}',
    '.lens-overlay{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:var(--paper);color:var(--ink);display:none;overflow:auto;}',
    '.lens-overlay[open]{display:block;}',
    '.lens-overlay::backdrop{background:rgba(20,20,20,.65);}',
    '.lens-overlay-close{position:sticky;top:20px;left:calc(100% - 68px);z-index:2;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:1px solid var(--fog);background:var(--white);color:var(--ink);cursor:pointer;}',
    '.lens-overlay-close svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.6;}',
    '.lens-overlay-inner{display:grid;grid-template-columns:minmax(150px,240px) minmax(0,1fr);gap:40px;align-items:center;min-height:calc(100dvh - 88px);max-width:1240px;margin:0 auto;padding:24px 32px 80px;}',
    '.lens-detail-media{display:flex;align-items:center;justify-content:center;aspect-ratio:1;background:var(--white);}',
    '.lens-detail-media img{display:block;width:100%;height:100%;object-fit:contain;}',
    '.lens-diagram{width:100%;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:var(--fog) transparent;}',
    '.lens-diagram::-webkit-scrollbar{height:5px;}',
    '.lens-diagram::-webkit-scrollbar-thumb{background:var(--fog);border-radius:5px;}',
    '.lens-diagram::-webkit-scrollbar-button{display:none;}',
    '.optics-svg{display:block;width:100%;height:auto;}',
    '.optics-svg .lens-axis{stroke:var(--fog);stroke-width:.8;}',
    '.optics-svg .el-glass path{fill:none;stroke:var(--ink);stroke-width:1.6;}',
    '.optics-svg .el-aspherical path{stroke:var(--accent-gold);}',
    '.optics-svg .el-iris path{fill:none;stroke:var(--accent-gold);stroke-width:1.6;}',
    '@media(max-width:640px){.lens-section{padding-top:32px;}.lens-overlay-close{top:16px;left:calc(100% - 64px);}.lens-overlay-inner{grid-template-columns:1fr;align-content:center;gap:40px;padding:20px 0 60px;}.lens-detail-media{width:180px;margin:0 auto;}.optics-svg{width:680px;max-width:none;}}',
    '@media(prefers-reduced-motion:reduce){.lens-card{transition:none;}}'
  ].join('');
  var style=document.createElement('style');
  style.textContent=CSS;
  document.head.appendChild(style);

  var opener=null,previousOverflow='';
  function overlay(){
    var dialog=document.getElementById('lens-overlay');
    if(dialog) return dialog;
    dialog=document.createElement('dialog');
    dialog.id='lens-overlay';
    dialog.className='lens-overlay';
    dialog.setAttribute('aria-label','镜片结构图');
    document.body.appendChild(dialog);
    dialog.addEventListener('close',function(){
      document.body.style.overflow=previousOverflow;
      if(opener && opener.isConnected) opener.focus({preventScroll:true});
    });
    return dialog;
  }
  function openLens(lens,button){
    var dialog=overlay();
    opener=button;
    previousOverflow=document.body.style.overflow;
    var media=lens.photo
      ? '<img src="'+escapeAttribute(lens.photo)+'" alt="">'
      : silhouetteSVG(lens);
    dialog.innerHTML='<button class="lens-overlay-close" type="button" aria-label="关闭镜片结构图">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>'+
      '<div class="lens-overlay-inner"><div class="lens-detail-media">'+media+'</div><div class="lens-diagram" tabindex="0" role="region" aria-label="可左右滚动的镜片结构图">'+opticsSVG(lens)+'</div></div>';
    dialog.querySelector('.lens-overlay-close').addEventListener('click',function(){dialog.close();});
    dialog.showModal();
    document.body.style.overflow='hidden';
    dialog.querySelector('.lens-overlay-close').focus();
    var diagram=dialog.querySelector('.lens-diagram');
    if(diagram.scrollWidth>diagram.clientWidth) diagram.scrollLeft=(diagram.scrollWidth-diagram.clientWidth)/2;
  }

  function mount(container){
    fetch('lenses.json?t='+Date.now())
      .then(function(response){if(!response.ok) throw new Error('lenses.json');return response.json();})
      .then(function(lenses){
        container.replaceChildren();
        if(!Array.isArray(lenses)) return;
        var row=document.createElement('div');
        row.className='lens-row';
        lenses.forEach(function(lens){
          var button=document.createElement('button');
          button.type='button';
          button.className='lens-card';
          button.setAttribute('aria-label','查看 '+(lens.name||'镜头')+'的结构图');
          if(lens.photo){
            var img=document.createElement('img');
            img.src=lens.photo;
            img.alt='';
            img.loading='lazy';
            img.addEventListener('error',function(){button.innerHTML=silhouetteSVG(lens);},{once:true});
            button.appendChild(img);
          }else button.innerHTML=silhouetteSVG(lens);
          button.addEventListener('click',function(){openLens(lens,button);});
          row.appendChild(button);
        });
        container.appendChild(row);
      })
      .catch(function(){container.replaceChildren();});
  }
  window.LENS_UI={mount:mount,opticsSVG:opticsSVG};
})();
