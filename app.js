/*
 * Vue.js app.
 */

deparam = function (querystring) {
  // remove any preceding url and split
  querystring = querystring.substring(querystring.indexOf('?')+1).split('&');
  var params = {}, pair, d = decodeURIComponent, i;
  // march and parse
  for (i = querystring.length; i > 0;) {
    pair = querystring[--i].split('=');
    params[d(pair[0])] = d(pair[1]);
  }

  return params;
};//--  fn  deparam

var router = new VueRouter({
  mode: 'history',
  routes: []
});

var app = new Vue({
  router,
  el: '#app',

  data: {
    message: 'Hello MathVue! With Bootstrap 4.0.',
    formula: null,
    running: false,
    started: false,
    link: makeLink(false, defaultFormula),
    linkToGithub: makeLink(true, defaultFormula),

    dropboxAllowed: true,
    dropboxLoginUrl: dropbox.getLoginUrl(),
    dropboxLoggedIn: dropbox.isLoggedIn(),
    dropboxDisplayname: null,
    dropboxFiles: [],
    dropboxDialog: null,
    dropboxLoadingDialog: null,
  },
  
  methods: {
    run: function (event) {
      this.running = true;
      this.started = true;
      loadSketch(this.formula);
    },
    pause: function (event) {
      this.running = false;
      switchSketchState(false);
    },
    resume: function (event) {
      if (!this.started) {
        this.run();
      } else {
        this.running = true;
        switchSketchState(true);
      }
    },
    onInput: function () {
      this.link = makeLink(false, this.formula);
      this.linkToGithub = makeLink(true, this.formula);
      saveFormula(this.formula);
    },
    fullScreen: function(event) {
      // full screen
      var el = document.getElementById("mathvisionCanvas");
      if(el.webkitRequestFullScreen) {
        el.webkitRequestFullScreen();
      } else {
        el.mozRequestFullScreen();
      }
      // (re)start
      if (!this.started) {
        this.run();
      } else {
        this.resume();
      }
    },
    dropboxLogout: function() {
      dropbox.setToken(null);
      this.dropboxLoggedIn = dropbox.isLoggedIn();
    },
    dropboxSave: function() {},
    dropboxLoad: function() {
      this._dropboxLoad(null, null);
    },      
    _dropboxLoad: function(cursorNext) {
      var that = this;
      if (that.dropboxLoadingDialog)
        that.dropboxLoadingDialog.close();
      that.dropboxLoadingDialog = BootstrapDialog.show({
        message:'Querying Dropbox...',
        animate: cursorNext==null,
      });
      dropbox.listFiles(cursorNext, function(data) {
        var entries = data.entries
            .filter(function(entry) {return entry.name.endsWith('.formula')});
        var names = entries
            .map(function(entry) {return entry.name});

        var content = $('<div></div>');
        for (var i in names)
          content.append('<button onclick="app.dropboxLoadFile('+i+')">'
                         + names[i] + '</button></br>');
        if (entries.length == 0) {
          content.append('No formula files in this batch');
        }
        if (data.has_more) {
          content.append('<button class="float-right" onclick="app.dropboxLoadMore(\''
                         + data.cursor+'\')">Next &gt;</button>');
        }

        if (that.dropboxLoadingDialog)
          that.dropboxLoadingDialog.close();

        that.dropboxFiles = entries;
        that.dropboxDialog = BootstrapDialog.show({
          animate: false,
          title: 'Choose a file from Dropbox',
          message: content, //names.join('\n')
        });
      }, function(error) {
        try {
          if (that.dropboxLoadingDialog)
            that.dropboxLoadingDialog.close();
          if (that.dropboxDialog)
            that.dropboxDialog.close();
        } catch (e) {}
        alert('ERROR ' + error.response.status + ':\n' + JSON.stringify(error.response.data));
      });
    },
    dropboxLoadMore: function(cursorNext) {
      if (this.dropboxDialog)
        this.dropboxDialog.close();
      this._dropboxLoad(cursorNext);
    },
    dropboxLoadFile: function(index) {
      alert(JSON.stringify(this.dropboxFiles[index]));
    }
  },

  mounted() {
    this.dropboxAllowed = !window.location.href.startsWith('file:');
    
    var that = this;
    // query
    if (this.$route.query.formula) {
      this.formula =  window.atob(this.$route.query.formula);
    } else {
      this.formula = defaultFormula;
    }
    var play = typeof this.$route.query.play !== "undefined";
    // hash
    if (this.$route.hash) {
      var params = deparam(this.$route.hash.substring(1));
      if (params.access_token) {
        dropbox.setToken(params.access_token);
        this.dropboxLoggedIn = dropbox.isLoggedIn();
      }
    }
    // dropbox session
    if (this.dropboxAllowed) {
      if (dropbox.isLoggedIn()) {
        // check if login still valid
        dropbox.loginIfNeeded(function(account_data) {
          that.dropboxLoggedIn = dropbox.isLoggedIn();
          that.dropboxDisplayname = account_data.name.display_name;
        }, function() {
          window.location.href = that.dropboxLoginUrl;
        });
      }
    }
    else {
      that.dropboxLoggedIn = false;
    }
    // auto-play?
    if (play) {
      this.run(null);
    }
    // reset url
    this.$router.push("");
  }
});

function makeLink(toGithub, formula) {
  var base = toGithub
      ? "https://rawgit.com/pbauermeister/MathVue/master/index.html"
      : "";
  return base + "?formula=" + window.btoa(formula) + "&play";
}
