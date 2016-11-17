Object.keys || (Object.keys = function (k) {
  var r = [];
  for (var i in k) r.push(i);
  return r;
});

var g = this;
var siteinfo = [], timestamp, manifest, site_stats = {}, site_fail_stats = {}, custom_info = {};
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

var H = location.href.replace('index.html', '');

window.AutoPatchWork = {
  state: true,
  css: '',
  barcss: '',
  config: {
    auto_start: true,
    target_blank: true,
    remain_height: 400,
    disable_iframe: false,
    debug_mode: false,
    bar_status: 'on'
  },
  save_css: function (css) {
    AutoPatchWork.css = localStorage.AutoPatchWorkCSS = css;
  },
  reset_css: function () {
    init_css();
  },
  update: function () {
    localStorage.AutoPatchWorkConfig = JSON.stringify(AutoPatchWork.config);
  },
  disable_sites: [],
  site_check: function (url) {
    if (url.indexOf('http') !== 0) return true;
    return AutoPatchWork.disable_sites.some(function (site) {
      if (site.type === 'regexp') {
        return new RegExp(site.matcher).test(url);
      } else if (site.type === 'prefix') {
        return url.indexOf(site.matcher) === 0;
      } else if (site.type === 'domain') {
        return new RegExp('^https?://' + site.matcher + '/').test(url);
      }
    });
  },
  add_disable_site: function (site) {
    AutoPatchWork.disable_sites.push(site);
    localStorage.disable_sites = JSON.stringify(AutoPatchWork.disable_sites);
  },
  save_disable_site: function () {
    localStorage.disable_sites = JSON.stringify(AutoPatchWork.disable_sites);
  },
  delete_disable_site: function (site) {
    var site_s = JSON.stringify(site);
    for (var i = 0; i < AutoPatchWork.disable_sites.length; i++) {
      var str = JSON.stringify(AutoPatchWork.disable_sites[i]);
      if (str === site_s) {
        AutoPatchWork.disable_sites.splice(i, 1);
        localStorage.disable_sites = JSON.stringify(AutoPatchWork.disable_sites);
        break;
      }
    }
  }
};
if (g.safari) {
  safari.extension.settings.addEventListener('change', function (evt) {
    if (evt.key in AutoPatchWork.config) {
      AutoPatchWork.config[evt.key] = evt.newValue;
    } else if (evt.key === 'excludes') {
      var urls = evt.newValue.trim().split(' ');
      AutoPatchWork.disable_sites = urls.map(function (url) {
        return {type: 'prefix', matcher: url};
      });
      AutoPatchWork.save_disable_site();
    }
  }, false);
}

if (localStorage.disable_sites) {
  AutoPatchWork.disable_sites = JSON.parse(localStorage.disable_sites);
} else {
  localStorage.disable_sites = JSON.stringify(AutoPatchWork.disable_sites);
}
if (localStorage.AutoPatchWorkConfig) {
  AutoPatchWork.config = JSON.parse(localStorage.AutoPatchWorkConfig);
} else {
  localStorage.AutoPatchWorkConfig = JSON.stringify(AutoPatchWork.config);
}
if (localStorage.site_stats) {
  site_stats = JSON.parse(localStorage.site_stats);
} else {
  localStorage.site_stats = JSON.stringify(site_stats);
}
if (localStorage.site_fail_stats) {
  site_fail_stats = JSON.parse(localStorage.site_fail_stats);
} else {
  localStorage.site_fail_stats = JSON.stringify(site_fail_stats);
}
if (localStorage.custom_info) {
  custom_info = JSON.parse(localStorage.custom_info);
} else {
  localStorage.custom_info = JSON.stringify(custom_info);
}
if (localStorage.AutoPatchWorkCSS) {
  AutoPatchWork.css = localStorage.AutoPatchWorkCSS;
} else {
  init_css();
}
init_barcss();

var version = '', Manifest;
IconData = {};

get_manifest(function (_manifest) {
  Manifest = _manifest;
  version = _manifest.version;
});

function siteinfoFromCache() {
  var data = Strg.get('siteinfo_wedata', true);
  siteinfo = data.siteinfo;
  timestamp = new Date(data.timestamp);
  applyCustom();
}
if (Strg.has('siteinfo_wedata')) {
  siteinfoFromCache();
} else {
  UpdateSiteinfo(null, function () {
    siteinfoFromCache();
  });
}
window.onload = function () {
  var CHROME_GESTURES = 'jpkfjicglakibpenojifdiepckckakgk';
  var CHROME_KEYCONFIG = 'okneonigbfnolfkmfgjmaeniipdjkgkl';
  var action = {
    group: 'AutoPatchWork',
    actions: [
      {name: 'AutoPatchWork.toggle'},
      {name: 'AutoPatchWork.request'}
    ]
  };
  g.chrome && chrome.extension.sendMessage(CHROME_GESTURES, action);
  g.chrome && chrome.extension.sendMessage(CHROME_KEYCONFIG, action);
};

var ToggleCode = '(' + (function () {
  var ev = document.createEvent('Event');
  ev.initEvent('AutoPatchWork.toggle', true, false);
  document.dispatchEvent(ev);
}).toString() + ')();';

g.chrome && chrome.extension.onMessage.addListener(handleMessage);

g.safari && safari.application.addEventListener("message", function (evt) {
  var name = evt.name;
  if (name === 'option_init') {
    evt.target.page.dispatchMessage(name, AutoPatchWork);
  } else if (name === 'invoke_action') {
    if (evt.message.action === 'update') {
      AutoPatchWork.config = evt.message.config;
      AutoPatchWork.update();
      Object.keys(AutoPatchWork.config).forEach(function (key) {
        safari.extension.settings[key] = AutoPatchWork.config[key];
      });
    } else if (evt.message.action === 'save_disable_site') {
      AutoPatchWork.disable_sites = evt.message.disable_sites;
      AutoPatchWork.save_disable_site();
    } else if (evt.message.action === 'UpdateSiteinfo') {
      UpdateSiteinfo(function () {
        evt.target.page.dispatchMessage('updated_siteinfo');
      }, null, true);
    } else {
      AutoPatchWork[evt.message.action].apply(AutoPatchWork, evt.message.args);
    }
  } else if (name === 'siteinfo_init') {
    evt.target.page.dispatchMessage(name, {
      siteinfo: siteinfo,
      custom_info: custom_info,
      site_stats: site_stats,
      site_fail_stats: site_fail_stats,
      AutoPatchWork: AutoPatchWork
    });
  } else {
    handleMessage(evt.message, {}, function (data) {
      evt.target.page.dispatchMessage(name, data);
    });
  }
}, false);

g.opera && (g.opera.extension.onmessage = function (evt) {
  var name = evt.data.name;
  var message = evt.data.data;
  if (name === 'option_init') {
    evt.source.postMessage({name: name, data: JSON.parse(JSON.stringify(AutoPatchWork))});
  } else if (name === 'invoke_action') {
    if (message.action === 'update') {
      AutoPatchWork.config = message.config;
      AutoPatchWork.update();
    } else if (message.action === 'save_disable_site') {
      AutoPatchWork.disable_sites = message.disable_sites;
      AutoPatchWork.save_disable_site();
    } else if (message.action === 'UpdateSiteinfo') {
      UpdateSiteinfo(function () {
        evt.source.postMessage({name: 'updated_siteinfo'});
      }, null, true);
    } else {
      AutoPatchWork[message.action].apply(AutoPatchWork, message.args);
    }
  } else if (name === 'siteinfo_init') {
    evt.source.postMessage({
      name: name,
      data: {
        siteinfo: siteinfo,
        custom_info: custom_info,
        site_stats: site_stats,
        site_fail_stats: site_fail_stats,
        AutoPatchWork: JSON.parse(JSON.stringify(AutoPatchWork))
      }
    });
  } else {
    handleMessage(message, {}, function (data) {
      evt.source.postMessage({name: name, data: data});
    });
  }
});

function handleMessage(request, sender, sendResponse) {
  if (request.message === 'AutoPatchWork.initialized') {
    var id = request.siteinfo['wedata.net.id'] || 'microformats';
    site_stats[id] = ++site_stats[id] || 1;
    localStorage.site_stats = JSON.stringify(site_stats);
    return;
  }
  if (request.failed_siteinfo) {
    request.failed_siteinfo.forEach(function (s) {
      var id = s['wedata.net.id'];
      if (!id) {
        return;
      }
      site_fail_stats[id] = ++site_fail_stats[id] || 1;
    });
    localStorage.site_fail_stats = JSON.stringify(site_fail_stats);
    return;
  }
  if (request.manage) {
    openOrFocusTab('siteinfo_manager.html');
    return;
  }
  if (request.options) {
    openOrFocusTab('options.html');
    return;
  }
  if (!AutoPatchWork.state) return;
  if (request.isFrame && AutoPatchWork.config.disable_iframe) {
    return;
  }
  var infos = [], url = request.url;
  if (!url || AutoPatchWork.site_check(url)) return;
  if (url.index) return;
  for (var i = 0, len = siteinfo.length, s; i < len; i++) {
    s = siteinfo[i];
    if (!s.disabled && new RegExp(siteinfo[i].url).test(url)) {
      infos.push(siteinfo[i]);
    }
  }
  sendResponse({siteinfo: infos, config: AutoPatchWork.config, css: AutoPatchWork.barcss + AutoPatchWork.css});
}
function openOrFocusTab(uri) {
  if (g.chrome) {
    chrome.windows.getAll({populate: true}, function (windows) {
      if (!windows.some(function (w) {
        if (w.type === 'normal') {
          return w.tabs.some(function (t) {
            if (t.url === H + uri) {
              chrome.tabs.update(t.id, {'selected': true});
              return true;
            }
          });
        }
      })) {
        chrome.tabs.getSelected(null, function (t) {
          chrome.tabs.create({'url': uri, 'selected': true, index: t.index + 1});
        });
      }
    });
  } else if (g.safari) {
    if (!safari.application.browserWindows.some(function (w) {
      return w.tabs.some(function (t) {
        if (t.url.indexOf(H + uri) === 0) {
          t.activate();
          return true;
        }
      });
    })) {
      safari.application.activeBrowserWindow.openTab().url = H + uri;
    }
  } else if (g.opera) {
    opera.extension.tabs.create({url: uri});
  }
}
function getWedataId(inf) {
  return parseInt(inf.resource_url.replace('http://wedata.net/items/', ''), 10);
}
function applyCustom(info) {
  siteinfo.forEach(function (i) {
    var id = i['wedata.net.id'];
    var ci = custom_info[id];
    if (ci) {
      Object.keys(ci).forEach(function (k) {
        i[k] = ci[k];
      });
    }
  });
}
function Siteinfo(info) {
  var required_keys = ['nextLink', 'pageElement', 'url'];
  var keys = required_keys.concat(['insertBefore']);
  siteinfo = [];
  info.forEach(function (i) {
    var d = i.data || i, r = {};
    var invalid = false;
    keys.forEach(function (k) {
      if (d[k]) {
        r[k] = d[k];
      }
    });
    required_keys.forEach(function (k) {
      if (!r[k]) invalid = true;
    });
    if (invalid) {
      return;
    }
    try {
      new RegExp(r.url);
    } catch (e) {
      return;
    }
    r['wedata.net.id'] = i['wedata.net.id'] || getWedataId(i);
    siteinfo.push(r);
  });
  siteinfo.sort(function (a, b) {
    return (b.url.length - a.url.length);
  });
  siteinfo.push.apply(siteinfo, MICROFORMATs);
  siteinfo.push({
    "url": "^http://matome\\.naver\\.jp/",
    "nextLink": "//div[contains(@class, \"MdPagination03\")]/a[preceding-sibling::strong]",
    "pageElement": "//div[contains(@class, \"MdMTMWidgetList01\")]/*",
    //exampleUrl:  'http://matome.naver.jp/odai/2124461146762161898',
    "wedata.net.id": "matome.naver"
  });
  window.opera && siteinfo.push({
    url: '^http://www\\.google\\.(?:[^.]+\\.)?[^./]+/images\\?.',
    nextLink: 'id("nav")//td[@class="cur"]/following-sibling::td/a',
    pageElement: '//table[tbody/tr/td/a[contains(@href, "/imgres")]]'
    //,exampleUrl:  'http://images.google.com/images?gbv=2&hl=ja&q=%E3%83%9A%E3%83%BC%E3%82%B8'
  });
  timestamp = new Date;
  Strg.set('siteinfo_wedata', {siteinfo: siteinfo, timestamp: timestamp.toLocaleString()}, {day: 1});
  applyCustom();
}
function get_manifest(callback) {
  var url = './manifest.json';
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(JSON.parse(xhr.responseText));
  };
  xhr.open('GET', url, true);
  xhr.send(null);
}
function init_css() {
  var url = 'css/AutoPatchWork.css';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    AutoPatchWork.save_css(xhr.responseText);
  };
  xhr.send(null);
}
function init_barcss() {
  var url = 'css/AutoPatchWork.bar.css';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    AutoPatchWork.barcss = xhr.responseText;
  };
  xhr.send(null);
}
function UpdateSiteinfo(callback, error_back, force) {
  var sso = 'http://os0x.heteml.jp/ss-onet/json/wedataAutoPagerizeSITEINFO.json';
  var wedata = 'http://wedata.net/databases/AutoPagerize/items.json';
  var url = force ? wedata : sso;
  var xhr = new XMLHttpRequest();
  siteinfo = [];
  xhr.onload = function () {
    var info;
    try {
      info = JSON.parse(xhr.responseText);
      Siteinfo(info);
      if (typeof callback === 'function') {
        callback();
      }
    } catch (e) {
      if (typeof error_back === 'function') {
        error_back(e);
      } else {
        throw e;
      }
    }
  };
  xhr.onerror = function (e) {
    if (url === wedata) {
      UpdateSiteinfo(callback, error_back, false);
    } else if (typeof error_back === 'function') {
      error_back(e);
    }
  };
  xhr.open('GET', url, true);
  xhr.send(null);
}
