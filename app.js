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
    dropboxBusyDialog: null,
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
    _showBusyDialog: function(message) {
      this.dropboxBusyDialog = BootstrapDialog.show({
        message: message + '<div class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%"></div></div>',
        animate: true,
        size: BootstrapDialog.SIZE_SMALL
      });
    },
    _closeBusyDialog: function() {
      try {
        this.dropboxBusyDialog && this.dropboxBusyDialog.close();
      } catch (e) {}
      this.dropboxBusyDialog = null;
    },
    dropboxLogout: function() {
      dropbox.setToken(null);
      this.dropboxLoggedIn = dropbox.isLoggedIn();
    },
    dropboxSave: function() {},
    dropboxLoad: function() {
      this._dropboxCloseDialogs();
      this._showBusyDialog('Querying Dropbox...');
      dropbox.listFiles(null, function(data) {
        this._dropboxShowFiles(data);
      }.bind(this), function(error) {
        this._dropboxError(error);
      }.bind(this));
    },
    _dropboxError(error) {
      this._dropboxCloseDialogs();
      alert('ERROR ' + error.response.status + ':\n' + JSON.stringify(error.response.data));
    },
    _dropboxShowFiles: function(entries) {
      var entries = entries
          .filter(function(entry) {return entry['.tag']=='file'})
          //.filter(function(entry) {return entry.name.endsWith('.formula')});
      var names = entries
          .map(function(entry) {return entry.name});

      var content = $('<div class="dialog-file-list"></div>');
      for (var i in names)
        content.append('<button class="btn btn-sm button-list-item" onclick="app.dropboxLoadFile('+i+')">'
                       + names[i] + '</button></br>');
      if (entries.length == 0) {
        content.append('No formula files in this batch');
      }
      this._closeBusyDialog();
      this.dropboxFiles = entries;
      this.dropboxDialog = BootstrapDialog.show({
        animate: false,
        title: 'Choose a file from Dropbox',
        message: content, //names.join('\n')
      });
    },
    dropboxLoadFile: function(index) {
      this._dropboxCloseDialogs();
      this._showBusyDialog('Loading from Dropbox...');
      dropbox.getFile(this.dropboxFiles[index].id, function(data) {
        this.formula = data; // <== bim!
        saveFormula(this.formula);
        this._dropboxCloseDialogs();
      }.bind(this), function(error) {
        this._dropboxError(error);
      }.bind(this));
    },
    _dropboxCloseDialogs: function() {
      this._closeBusyDialog();
      try {
        this.dropboxDialog && this.dropboxDialog.close();
      } catch (e) {}
      this.dropboxDialog = null;
    }
  },

  mounted() {
    this.dropboxAllowed = !window.location.href.startsWith('file:');
    
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
          this.dropboxLoggedIn = dropbox.isLoggedIn();
          this.dropboxDisplayname = account_data.name.display_name;
        }.bind(this), function() {
          window.location.href = thsi.dropboxLoginUrl;
        }.bind(this));
      }
    }
    else {
      thsi.dropboxLoggedIn = false;
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
