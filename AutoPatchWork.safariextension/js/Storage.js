(function(){
  if (!this.localStorage || this.Strg) return;
  var Storage = this.Strg = {
    get_data:function(key){
      var val = localStorage.getItem(key);
      if (val) {
        return JSON.parse(val);
      }
      return null;
    },
    get:function(key, force){
      var data = Storage.get_data(key);
      if (data.expire) {
        var expire = new Date(data.expire);
        if (expire.getTime() > new Date().getTime()) {
          return data.value;
        } else if(force) {
          return data.value;
        } else {
          localStorage.removeItem(key);
        }
      } else if (data.hasOwnProperty('value')) {
        return data.value;
      } else {
        return data;
      }
      return null;
    },
    has:function(key, do_delete){
      if (localStorage[key] === void 0) {
        return false;
      }
      var data = Storage.get_data(key);
      if (data.expire) {
        var expire = new Date(data.expire);
        if (expire.getTime() > new Date().getTime()) {
          return true;
        } else {
          do_delete && localStorage.removeItem(key);
        }
      } else {
        return true;
      }
      return false;
    },
    set:function(key, value, expire){
      var data = {value:value};
      if (expire) {
        if (expire instanceof Date) {
          data.expire = expire.toString();
        } else {
          if (typeof expire === 'object') {
            expire = duration(expire);
          }
          var time = new Date();
          time.setTime(time.getTime() + expire);
          data.expire = time.toString();
        }
      }
      localStorage.setItem(key, JSON.stringify(data));
    }
  };
  Storage.duration = duration;
  // http://gist.github.com/46403
  function duration (dat) {
    var ret = 0, map = {
      sec:1, min:60, hour:3600, day:86400, week:604800,
      month:2592000, year:31536000
    };
    Object.keys(dat).forEach(function(k){if(map[k] > 0)ret += dat[k] * map[k];});
    return ret * 1000;
  }
})();
