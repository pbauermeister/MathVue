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
  },
  
  methods: {
    //
    // Animation methods
    //
    
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

    //
    // Formula methods
    //

    onInput: function () {
      this.link = makeLink(false, this.formula);
      this.linkToGithub = makeLink(true, this.formula);
      saveFormula(this.formula);
    },

    //
    // Dropbox methods
    //
    
    _dropboxError: function(error) {
      this._dropboxCloseDialogs();
      alert('ERROR ' + error.response.status + ':\n' + JSON.stringify(error.response.data));
    },

    dropboxLogout: function() {
      dropbox.setToken(null);
      this.dropboxLoggedIn = dropbox.isLoggedIn();
    },

    dropboxSaveDialog: function() {      
      var busy = fileDialog.showBusyDialog('Reading files list from Dropbox...');
      dropbox.listFiles(null, function(entries) {
        busy.close();
        fileDialog.saveFile(entries, this.dropboxSaveFile);
        //this._dropboxShowFilesForSave(data);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },

    dropboxSaveFile: function(entries, filename) {
      var names = entries.map(entry => entry.name)
      if (names.indexOf(filename) > -1)
        alert(filename + " exists");
      alert(filename);
      // TODO Save to DBox
    },

    dropboxLoadDialog: function() {
      var busy = fileDialog.showBusyDialog('Reading files list from Dropbox...');
      dropbox.listFiles(null, function(entries) {
        busy.close();
        fileDialog.openFile(entries, this.dropboxLoadFile);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },

    dropboxLoadFile: function(entry) {
      var busy = fileDialog.showBusyDialog('Loading from Dropbox...');
      dropbox.getFile(entry.id, function(data) {
        busy.close();
        this.formula = data; // <== bim!
        saveFormula(this.formula);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },
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
