(()=>{let timer=0;
 function callout(type){const labels={critical:'CRITICAL!',block:'BLOCK',dodge:'DODGE',guardBreak:'GUARD BREAK',hit:'HIT'},el=document.querySelector('#combat-callout');if(!el)return;el.textContent=labels[type]||'';el.className=`combat-callout show ${type}`;clearTimeout(timer);timer=setTimeout(()=>el.className='combat-callout',650)}
 socket.on('attackResult',d=>callout(d.type));
 const original=views['/game'];views['/game']=()=>original().replace('<div id="message-layer"','<div id="combat-callout" class="combat-callout"></div><div id="message-layer"').replace('<span><kbd>SPACE</kbd> 펀치</span>','<span><kbd>S</kbd> 가드</span><span><kbd>↓</kbd> 앉기/회피</span><span><kbd>SPACE</kbd> 펀치</span>');if(location.pathname==='/game')navigate('/game',false);
})();
