Object.keys || (Object.keys = function(k){
  var r = [];
  for (var i in k) r.push(i);
  return r;
});
(function option_init(opt){
var g = this;
if(this.chrome){
  BackGround = chrome.extension.getBackgroundPage();
  AutoPatchWork = BackGround.AutoPatchWork;
} else if (this.safari && !opt){
  safari.self.tab.dispatchMessage('option_init');
  safari.self.addEventListener('message',function(evt){
  if(evt.name === 'option_init'){
    option_init(evt.message);
  } else if(evt.name === 'updated_siteinfo') {
    BackGround.callback();
  }
  },false);
  return;
} else if (this.opera && !opt){
  opera.extension.onmessage = function(evt){
    if(evt.data.name === 'option_init'){
      option_init(evt.data.data);
    } else if(evt.data.name === 'updated_siteinfo') {
      BackGround.callback();
    }
  };
  opera.extension.postMessage({name:'option_init'});
  return;
} else if (opt && g.safari){
  AutoPatchWork = opt;
  ['save_css','reset_css','add_disable_site','delete_disable_site'].forEach(function(action){
    AutoPatchWork[action] = function(){
      safari.self.tab.dispatchMessage('invoke_action',{action:action, args:Array.prototype.slice.call(arguments)});
    };
  });
  AutoPatchWork.update = function(){
    safari.self.tab.dispatchMessage('invoke_action',{action:'update', config:AutoPatchWork.config});
  };
  AutoPatchWork.save_disable_site = function(){
    safari.self.tab.dispatchMessage('invoke_action',{action:'save_disable_site', disable_sites:AutoPatchWork.disable_sites});
  };
  BackGround = {UpdateSiteinfo:function(callback){
    BackGround.callback = callback;
    safari.self.tab.dispatchMessage('invoke_action',{action:'UpdateSiteinfo'});
  }};
} else if (opt && g.opera){
  AutoPatchWork = opt;
  ['save_css','reset_css','add_disable_site','delete_disable_site'].forEach(function(action){
    AutoPatchWork[action] = function(){
      opera.extension.postMessage({name:'invoke_action',data:{action:action, args:Array.prototype.slice.call(arguments)}});
    };
  });
  AutoPatchWork.update = function(){
    opera.extension.postMessage({name:'invoke_action',data:{action:'update', config:AutoPatchWork.config}});
  };
  AutoPatchWork.save_disable_site = function(){
    opera.extension.postMessage({name:'invoke_action',data:{action:'save_disable_site', disable_sites:AutoPatchWork.disable_sites}});
  };
  BackGround = {UpdateSiteinfo:function(callback){
    BackGround.callback = callback;
    opera.extension.postMessage({name:'invoke_action',data:{action:'UpdateSiteinfo'}});
  }};
}

var WIDTH = 800;
var HEIGHT = Math.max(window.innerHeight - 100, 500);

var i18n = this.chrome ? chrome.i18n:
           this.safari ? {
                           getAcceptLanguages:function(){},
                           getMessage:function(){}
                         }:
                         {
                           getAcceptLanguages:function(){},
                           getMessage:function(){}
                         };

function L10N(){
  i18n.getAcceptLanguages(function(langs){
    if (langs.indexOf('ja') < 0 ) {
      document.querySelector('#menu_tabs > li.news').style.display = 'none';
    }
  });
  var elems = document.querySelectorAll('*[class^="MSG_"]');
  Array.prototype.forEach.call(elems, function(node){
    var key = node.className.match(/MSG_(\w+)/)[1];
    var message = i18n.getMessage(key);
    if (message) node.textContent = message;
  });
}
L10N();


var open_siteinfo_manager = document.getElementById('open_siteinfo_manager');
open_siteinfo_manager.addEventListener('click',function(e){
  if(window.chrome) {
    window.chrome.tabs.getCurrent(function(tab){
      chrome.tabs.update(tab.id,{url:"siteinfo_manager.html"});
    });
  } else if(window.safari){
    safari.self.tab.dispatchMessage('options', {manage:true});
  } else if(window.opera){
    opera.extension.postMessage({name:'options', data:{manage:true}});
  }
},false);

var update_siteinfo = document.getElementById('update_siteinfo');
var update_siteinfo_output = document.getElementById('update_siteinfo_output');
update_siteinfo.addEventListener('click',function(e){
  update_siteinfo.disabled = true;
  update_siteinfo_output.textContent = 'loading';
  BackGround.UpdateSiteinfo(function(){
    update_siteinfo_output.textContent = 'success';
    update_siteinfo.disabled = false;
  },function(){
    update_siteinfo_output.textContent = 'sorry, something wrong.';
  }, true);
},false);

$X('//input[@type="radio"]').forEach(function(box){
  var id = box.id;
  var name = box.name;
  var val = AutoPatchWork.config[name] || 'on';
  if (val == box.value) {
    box.checked = true;
  } else {
  }
  box.addEventListener('click',function(){
    AutoPatchWork.config[name] = box.value;
    AutoPatchWork.update();
  },false);
});
$X('/html/body/div/div/section/div/input[@type="checkbox"]').forEach(function(box){
  var id = box.id;
  var val = AutoPatchWork.config[id];
  if (val === true || val === false) {
    box.checked = val;
  } else {
    //return;
  }
  box.addEventListener('click',function(){
    if (box.checked) {
      AutoPatchWork.config[id] = true;
    } else {
      AutoPatchWork.config[id] = false;
    }
    AutoPatchWork.update();
  },false);
});
$X('/html/body/div/div/section/div/input[@type="range"]').forEach(function(box){
  var id = box.id;
  var output = document.querySelector('#' + id + '_value');
  var val = AutoPatchWork.config[id];
  box.value = val;
  output.textContent = box.value;
  box.addEventListener('change',function(){
    AutoPatchWork.config[id] = +this.value;
    output.textContent = box.value;
    AutoPatchWork.update();
  },false);
});

var css_text = document.getElementById('css_text');
css_text.value = AutoPatchWork.css;
var apply_css = document.getElementById('apply_css');
apply_css.addEventListener('click',function(){
  AutoPatchWork.save_css(css_text.value);
},false);

var reset_css = document.getElementById('reset_css');
reset_css.addEventListener('click',function(){
  AutoPatchWork.reset_css();
  setTimeout(function(){
    css_text.value = AutoPatchWork.css = localStorage.AutoPatchWorkCSS;
  },0);
},false);

var filter_list = document.getElementById('filter_list');
var filter_text = document.getElementById('filter_text');
var filter_type = document.getElementById('filter_type');
var add_filter = document.getElementById('add_filter');
AutoPatchWork.disable_sites.forEach(create_filter);
function create_filter(site) {
  var li = document.createElement('li');
  var types = filter_type.cloneNode(true);
  types.id = '';
  li.appendChild(types);
  types.value = site.type;
  types.addEventListener('change',function(){
    site.type = types.value;
    AutoPatchWork.save_disable_site();
  },false);
  var input = document.createElement('input');
  input.type = 'text';
  input.value = site.matcher;
  input.addEventListener('input',function(){
    site.matcher = input.value;
    AutoPatchWork.save_disable_site();
  },false);
  li.appendChild(input);
  var del = document.createElement('button');
  del.textContent = i18n.getMessage('del') || 'Del';
  del.addEventListener('click',function(){
    input.disabled = !input.disabled;
    if (input.disabled) {
      AutoPatchWork.delete_disable_site(site);
      del.textContent = i18n.getMessage('undo') || 'Undo';
    } else {
      AutoPatchWork.add_disable_site(site);
      del.textContent = i18n.getMessage('del') || 'Del';
    }
  },false);
  li.appendChild(del);
  filter_list.appendChild(li);
}
add_filter.addEventListener('click',function(){
  var site = filter_text.value;
  if (!site) return;
  var type = filter_type.value;
  if (type === 'regexp'){
    try {
      new RegExp(site);
    } catch (e) {
      return;
    }
  }
  site = {matcher:site,type:type};
  create_filter(site);
  AutoPatchWork.add_disable_site(site);
  filter_text.value ='';
},false);


var sections = $X('/html/body/div/div/section[contains(@class, "content")]');
var inner_container = document.getElementById('inner_container');
var container = document.getElementById('container');
inner_container.style.width = sections.length * (WIDTH+20) + 'px';
//inner_container.style.height = HEIGHT + 'px';
//container.style.height = HEIGHT + 'px';
container.style.marginTop = '-2px';
sections.forEach(function(section, _i){
  section.style.visibility = 'hidden';
  section.style.height = '100px';
});
var btns = $X('id("menu_tabs")/li/a');
var default_title = document.title;
btns.forEach(function(btn, i, btns){
  btn.addEventListener('click',function(evt){
    evt.preventDefault();
    btns.forEach(function(btn){btn.className = '';})
    btn.className = 'active';
    sections[i].style.visibility = 'visible';
    sections[i].style.height = 'auto';
    new Tween(inner_container.style, {marginLeft:{to:i * -WIDTH,tmpl:'$#px'},time:0.2,onComplete:function(){
        document.title = default_title + btn.hash;
        !window.opera && (location.hash = btn.hash);
        window.scrollBy(0, -1000);
        sections.forEach(function(section, _i){
          if (i !== _i) {
            section.style.visibility = 'hidden';
            section.style.height = '100px';
          }
        });
      }});
  }, false);
});
if (location.hash) {
  sections.some(function(section, i){
    if ('#' + section.id === location.hash) {
      btns.forEach(function(btn){btn.className = '';})
      btns[i].className = 'active';
      inner_container.style.marginLeft = -WIDTH * i + 'px';
      section.style.visibility = 'visible';
      section.style.height = 'auto';
      document.title = default_title + location.hash;
    }
  });
} else {
  sections[0].style.height = 'auto';
  sections[0].style.visibility = 'visible';
  document.title = default_title + '#' + sections[0].id;
}
})();
