Object.keys || (Object.keys = function (k) {
  var r = [];
  for (var i in k) r.push(i);
  return r;
});
var COUNT = 100;
var PageIndex = 0;
var MICROFORMATs = [
  {
    url: '^https?://.',
    nextLink: '//a[@rel="next"] | //link[@rel="next"]',
    insertBefore: '//*[contains(concat(" ",@class," "), " autopagerize_insert_before ")]',
    pageElement: '//*[contains(concat(" ",@class," "), " autopagerize_page_element ")]'
  }
  ,
  {
    url: '^https?://.',
    nextLink: '//link[@rel="next"] | //a[contains(concat(" ",@rel," "), " next ")] | //a[contains(concat(" ",@class," "), " next ")]',
    pageElement: '//*[contains(concat(" ",@class," "), " hfeed ") or contains(concat(" ",@class," "), " xfolkentry ")]'
  }
];

(function siteinfo_init(BackGround) {
  var g = this;
  if (g.safari && !BackGround) {
    safari.self.tab.dispatchMessage('siteinfo_init');
    safari.self.addEventListener('message', function (evt) {
      siteinfo_init(evt.message);
    }, false);
    return;
  } else if (g.opera && !BackGround) {
    //console.log(g.opera);
    opera.extension.onmessage = function (evt) {
      siteinfo_init(evt.data.data);
    };
    opera.extension.postMessage({name: 'siteinfo_init'});
    return;
  }
  BackGround = BackGround || chrome.extension.getBackgroundPage();
  var getWedataId = BackGround.getWedataId || function getWedataId(inf) {
    return parseInt(inf.resource_url.replace('http://wedata.net/items/', ''), 10);
  };

  window.addEventListener('AutoPatchWork.request', function (e) {
    e.stopPropagation();
  }, true);
  window.addEventListener('AutoPatchWork.append', function (e) {
    var infos = filtered_info.length ? filtered_info : siteinfo_data;
    if (infos && infos.length > COUNT * (PageIndex + 1)) {
      PageIndex++;
      SiteinfoView(infos.slice(COUNT * PageIndex, COUNT * (PageIndex + 1)), COUNT * PageIndex);
    }
    e.stopPropagation();
  }, true);
  function dispatch_event(type, opt) {
    var ev = document.createEvent('Event');
    ev.initEvent(type, true, false);
    if (opt) {
      Object.keys(opt).forEach(function (k) {
        if (!ev[k]) {
          ev[k] = opt[k];
        }
      });
    }
    document.dispatchEvent(ev);
  }

  var debug = BackGround.AutoPatchWork.config.debug_mode;

  var bg_siteinfo = BackGround.siteinfo;
  var custom_info = BackGround.custom_info;
  var site_stats = BackGround.site_stats;
  var site_fail_stats = BackGround.site_fail_stats;
  var successful = 'number_of_successful';
  var failed = 'number_of_failed'
  var sitemap = {};
  bg_siteinfo.forEach(function (v) {
    v['wedata.net.id'] && (sitemap[v['wedata.net.id']] = v);
  });
//if (!this.chrome || !chrome.tabs) return;
  var siteinfo_data, timestamp, filtered_info = [];

  var except_info = {"database_resource_url": true, "resource_url": true};

  var siteinfo_search_input = document.getElementById('siteinfo_search_input');
  var siteinfo_table = document.getElementById('siteinfo_table');
  var siteinfo_body = siteinfo_table.querySelector('tbody');
  var tmpl_line = document.getElementById('tmpl_siteinfo_body').firstChild;
  var siteinfo_nav = document.getElementById('siteinfo_nav');
  var siteinfo_view = document.getElementById('siteinfo_view');
  var siteinfo_head = document.getElementById('siteinfo_head');
  var types = {
    //"on/off":{number:true, key:'disabled'},
    "name": {string: true, key: 'name'},
    "created at": {string: true, key: 'created_at'},
    "updated at": {string: true, key: 'updated_at'},
    "created by": {string: true, key: 'created_by'},
    "resource url": {string: true, key: 'resource_url', filter: function (v) {
      v = wedata_filter(v);
      return ('_0000000000' + v).slice(-10);
    }},
    "database resource url": {string: true, key: 'database_resource_url', filter: wedata_filter},
    "number of successful": {number: true, key: 'number_of_successful'},
    "number of failed": {number: true, key: 'number_of_failed'}
  }

  function wedata_filter(v) {
    return v.replace(/http:\/\/wedata\.net\/(items\/|databases\/)?/, '');
  }

  var sorted = null;
  siteinfo_head.onclick = function (e) {
    var key = e.target.textContent;
    if (types[key]) {
      var infos = filtered_info.length ? filtered_info : siteinfo_data;
      sort_by(infos, types[key]);
      if (e.target.className === 'c-down') {
        e.target.className = 'c-up';
        infos.reverse();
      } else {
        e.target.className = 'c-down';
      }
      if (sorted && e.target !== sorted) {
        sorted.className = '';
      }
      SiteinfoView(infos.slice(0, COUNT));
      SiteinfoNavi(infos);
      sorted = e.target;
    }
  }
  siteinfo_view.onclick = function (e) {
    if (e.target === siteinfo_view) {
      siteinfo_view.style.top = -window.innerHeight + 'px';
      siteinfo_view.style.bottom = window.innerHeight + 'px';
      siteinfo_view.removeChild(siteinfo_view.firstChild);
    }
  };

  siteinfo_search_input.addEventListener('input', function (evt) {
    if (!siteinfo_data.length) return;
    var fullword = siteinfo_search_input.value, fullwords = [];
    var s = new Date * 1;
    if (fullword) {
      var ret = [], word = fullword.replace(/"([^"]+)"/g, function ($0, $1) {
        if ($1)ret.push($1);
        return '';
      });
      fullwords = word.split(/[\+\s\.:\|#]/).concat(ret).filter(function (w) {
        return w;
      });
    } else {
    }
    var keys = fullwords.map(function (k) {
      return new RegExp(k.replace(/\W/g, '\\$&'), 'im');
    });
    var siteinfo = siteinfo_data.filter(function (sinfo) {
      var ret = [];
      for (var k in sinfo) {
        if (except_info[k]) continue;
        var info = sinfo[k];
        if (typeof info === 'object') {
          for (var k2 in info) {
            ret.push(info[k2]);
          }
        } else {
          ret.push(info);
        }
      }
      var dat = ret.join('\n');
      if (keys.every(function (r) {
        return r.test(dat)
      }))
        return true;
      return false;
    });
    debug && console.log('search:' + (new Date - s) + 'ms');
    var v = new Date * 1;
    SiteinfoView(siteinfo.slice(0, COUNT));
    filtered_info = siteinfo;
    SiteinfoNavi(siteinfo);
    debug && console.log('view:' + (new Date - v) + 'ms');
  }, false);


  function url2anchor(url) {
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.textContent = url.replace(/http:\/\/wedata\.net\/(items\/|databases\/)?/, '');
    return a;
  }

  function urls2anchors(urls) {
    var df = document.createDocumentFragment();
    urls.split(/[\s\n\r]+/).map(url2anchor).forEach(function (a, i) {
      if (i) df.appendChild(document.createElement('br'));
      df.appendChild(a);
    });
    return df;
  }

  function string2date(date) {
    var t = document.createElement('time');
    t.setAttribute('datetime', date);
    t.setAttribute('title', date);
    t.textContent = date.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\+(\d{2}):(\d{2})/, '$1/$2/$3');
    return t;
  }

  var Text2Html = {
    "database_resource_url": url2anchor,
    "resource_url": url2anchor,
    "created_at": string2date,
    "updated_at": string2date,
    "exampleUrl": urls2anchors
  };

  function sort_by(siteinfo, opt) {
    if (opt.number) {
      siteinfo.sort(function (a, b) {
        return b[opt.key] - a[opt.key];
      });
    } else if (opt.string) {
      Object.prototype.toString = opt.filter ? filter2string : normal2string;
      siteinfo.sort();
      delete Object.prototype.toString;
    }
    function filter2string() {
      return opt.filter(this[opt.key]);
    }

    function normal2string() {
      return this[opt.key];
    }
  }

  function btn(opt, listener) {
    var btn = document.createElement('input');
    btn.id = opt.id;
    btn.type = opt.type;
    opt.hasOwnProperty('value') && (btn.value = opt.value);
    opt.parent.appendChild(btn);
    if (opt.text) {
      var label = document.createElement('label');
      label.htmlFor = opt.id;
      label.textContent = opt.text;
      opt.parent.appendChild(label);
    }
    btn.onclick = listener;
    return btn;
  }

  function applyStat(siteinfo) {
    siteinfo.forEach(function (info, i) {
      var id = getWedataId(info);
      info[successful] = site_stats[id] || 0;
      info[failed] = site_fail_stats[id] || 0;
    });
  }

  function SiteinfoView(siteinfo, append) {
    var df = document.createDocumentFragment();
    siteinfo.forEach(function (info, i) {
      var id = getWedataId(info);
      var used_data = sitemap[id];
      //var editBox = [];
      var line = tmpl_line.cloneNode(true);
      if (custom_info[id]) {
        var ci = custom_info[id];
        if (Object.keys(ci).some(function (k) {
          if (k === 'disabled') {
            return false;
          }
          return ci[k] !== info.data[k];
        })) {
          line.setAttribute('data-modified', 'modified');
        }
      }
      var disabled_btn = line.querySelector('input.onoff');
      if (used_data) {
        disabled_btn.checked = ('disabled' in used_data && used_data.disabled);
      } else {
        disabled_btn.disabled = true;
      }
      disabled_btn.onchange = function (e) {
        used_data.disabled = !used_data.disabled;
        if (!custom_info[id]) {
          custom_info[id] = {};
        }
        custom_info[id].disabled = used_data.disabled;
        localStorage.custom_info = JSON.stringify(custom_info);
      };
      df.appendChild(line);
      line.querySelector('td.index').textContent = 1 + i + (append || 0) + PageIndex * COUNT;
      Object.keys(info).forEach(function (k, i, info_keys) {
        var data = info[k];
        var td = line.querySelector('td.' + k);
        if (!td) return;
        if (k === 'name') {
          var btn = td.firstChild;
          btn.onclick = function () {
            var dl = document.createElement('dl');
            info_keys.forEach(function (k) {
              var data = info[k];
              var dt1 = document.createElement('dt');
              dt1.textContent = dt1.className = k;
              dl.appendChild(dt1);
              var dd1 = document.createElement('dd');
              dd1.className = k;
              dl.appendChild(dd1);
              if (typeof data === 'object') {
                var dl2 = document.createElement('dl');
                dd1.appendChild(dl2);
                Object.keys(data).forEach(function (k2) {
                  var inf = (used_data && used_data[k2]) ? used_data[k2] : data[k2];
                  if (inf) {
                    var dt2 = document.createElement('dt');
                    var dd2 = document.createElement('dd');
                    dl2.appendChild(dt2);
                    dl2.appendChild(dd2);
                    dt2.textContent = k2;
                    var node2;
                    if (Text2Html[k2]) {
                      node2 = Text2Html[k2](inf);
                    } else {
                      node2 = document.createElement('textarea');
                      node2.value = inf;
                      if (!used_data) {
                        node2.setAttribute('readonly', 'readonly');
                      }
                      node2.onchange = function () {
                        //console.log(used_data,used_data[k2],node2.value);
                        used_data[k2] = node2.value;
                        if (!custom_info[id]) {
                          custom_info[id] = {};
                        }
                        if (used_data[k2] === info.data[k2]) {
                          delete custom_info[id][k2];
                          var ci = custom_info[id];
                          if (Object.keys(ci).some(function (k) {
                            if (k === 'disabled') {
                              return false;
                            }
                            return ci[k] !== info.data[k];
                          })) {
                          } else {
                            line.removeAttribute('data-modified');
                          }
                        } else {
                          custom_info[id][k2] = node2.value;
                          line.setAttribute('data-modified', 'modified');
                        }
                        localStorage.custom_info = JSON.stringify(custom_info);
                      };
                      if (inf !== data[k2]) {
                        node2.setAttribute('data-modified', 'modified');
                        line.setAttribute('data-modified', 'modified');
                      }
                    }
                    dd2.appendChild(node2);
                  }
                });
              } else {
                var node;
                if (Text2Html[k]) {
                  node = Text2Html[k](data);
                } else {
                  node = document.createElement('span');
                  node.textContent = data;
                }
                dd1.appendChild(node);
              }
            });
            siteinfo_view.appendChild(dl);
            siteinfo_view.style.top = '0px';
            siteinfo_view.style.bottom = '0px';
            siteinfo_view.firstElementChild.style.top = (window.innerHeight - siteinfo_view.firstElementChild.offsetHeight) / 2 + 'px';
          };
          btn.textContent = data;
        } else if (Text2Html[k]) {
          td.appendChild(Text2Html[k](data));
        } else {
          td.textContent = data;
        }
      });
    });
    if (!append) {
      var n = siteinfo_body.cloneNode(false);
      siteinfo_table.replaceChild(n, siteinfo_body);
      siteinfo_body = n;
      sorted = null;
    }
    siteinfo_body.appendChild(df);
  }

  function SiteinfoNavi(siteinfo) {
    var nav = siteinfo_nav;
    PageIndex = 0;
    while (nav.firstChild) nav.removeChild(nav.firstChild);
    for (var i = 0, len = siteinfo.length / COUNT; i < len; i++) (function (i) {
      var a = document.createElement('a');
      a.textContent = i + 1;
      a.href = '#a' + i;
      a.id = 'a' + i;
      nav.appendChild(a);
      a.addEventListener('click', function (e) {
        PageIndex = i;
        SiteinfoView(siteinfo.slice(COUNT * i, COUNT * (i + 1)));
        window.scrollTo(0, 0);
        e.preventDefault();
      }, false);
    })(i);
    var r = nav.parentNode.getBoundingClientRect();
    siteinfo_table.style.marginTop = r.height + 10 + 'px';
  }

  function UpdateSiteinfo(callback) {
    var url = 'http://wedata.net/databases/AutoPagerize/items.json';
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      try {
        var d = JSON.parse(xhr.responseText);
      } catch (e) {
        console.log(e);
        return;
      }
      callback(d);
    };
    xhr.open('GET', url, true);
    xhr.send(null);
  }

  window.onresize = function () {
    siteinfo_view.style.top = -window.innerHeight + 'px';
    siteinfo_view.style.bottom = window.innerHeight + 'px';
  };

  if (sessionStorage.siteinfo_wedata) {
    siteinfo_data = JSON.parse(sessionStorage.siteinfo_wedata);
    applyStat(siteinfo_data);
    sort_by(siteinfo_data, {number: true, key: failed})
    SiteinfoView(siteinfo_data.slice(0, COUNT));
    SiteinfoNavi(siteinfo_data);
    window.onresize();
  } else {
    UpdateSiteinfo(function (siteinfo) {
      siteinfo_data = siteinfo;
      sessionStorage.siteinfo_wedata = JSON.stringify(siteinfo);
      applyStat(siteinfo_data);
      sort_by(siteinfo_data, {number: true, key: failed})
      SiteinfoView(siteinfo_data.slice(0, COUNT));
      SiteinfoNavi(siteinfo);
      window.onresize();
    });
  }
  dispatch_event('AutoPatchWork.siteinfo', {siteinfo: {
    url: '.',
    nextLink: '//*',
    pageElement: '//*'
  }});

})();
