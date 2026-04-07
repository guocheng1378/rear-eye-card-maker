// ─── Early Init: 主题 + 安全区（无依赖，页面加载前执行）───
(function(){
  try{
    var t=localStorage.getItem('jcm-theme');
    if(t){document.documentElement.setAttribute('data-theme',t);window.__themeBtn=t==='dark'?'🌙':'☀️'}
  }catch(e){}

  function setSafeArea(){
    var top=0, bottom=0;
    try{
      top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)'))||0;
      bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)'))||0;
    }catch(e){}
    if(!top){
      var d=document.createElement('div');
      d.style.cssText='position:fixed;top:0;left:0;right:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);pointer-events:none;z-index:-1;height:0;width:0;overflow:hidden';
      document.body.appendChild(d);
      var r=d.getBoundingClientRect();
      top=r.height;
      document.body.removeChild(d);
    }
    if(!top){
      if(/iPhone|iPad|iPod/.test(navigator.userAgent)) top=44;
      else if(/Android/.test(navigator.userAgent)) top=24;
    }
    if(!bottom&&/iPhone/.test(navigator.userAgent)&&window.screen.height>=812) bottom=34;
    if(top>0) document.documentElement.style.setProperty('--safe-top',top+'px');
    if(bottom>0) document.documentElement.style.setProperty('--safe-bottom',bottom+'px');
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',setSafeArea);
  }else{
    setSafeArea();
  }
  window.addEventListener('resize',function(){setTimeout(setSafeArea,200)});
  window.addEventListener('orientationchange',function(){setTimeout(setSafeArea,300)});
})();
