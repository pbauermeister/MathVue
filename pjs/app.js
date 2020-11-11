/*
 * Vue.js app.
 */

var deparam = function(querystring) {
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

const ENDING = 'formula';

var router = new VueRouter({
  mode: 'history',
  routes: []
});

var pjs_adaptor = new ProcessingJsAdaptor();
var pjs_formula = new ProcessingJsFormula()

var app = new Vue({
  router,
  el: '#app',

  data: {
    formula: null,
    running: false,
    started: false,
    link: makeLink(false, pjs_formula.defaultFormula),
    linkToGithub: makeLink(true, pjs_formula.defaultFormula),

    dropbox: new DropboxStorage(),
    dropboxAllowed: true,
    dropboxLoginUrl: null,
    dropboxLoggedIn: null,
    dropboxProfilePhotoUrl: null,
    dropboxDisplayname: null,
    dropboxFiles: [],
    dropboxDialog: null,

    fileDialog: new FileDialog(ENDING),
    ending: ENDING
  },

  methods: {
    //
    // Animation methods
    //

    run: function(event) {
      this.running = true;
      this.started = true;
      pjs_adaptor.loadSketch(this.formula);
    },

    pause: function(event) {
      this.running = false;
      pjs_adaptor.switchSketchState(false);
    },

    resume: function(event) {
      if (!this.started) {
        this.run();
      } else {
        this.running = true;
        pjs_adaptor.switchSketchState(true);
      }
    },

    runOneFrame: function() {
      this.run();
      this.pause();
    },

    grabImage: function() {
      if (!this.started) {
        this.runOneFrame();
      }
      var name = "mathvisionCanvas";
      var canvas = document.getElementById(name);
      var image = canvas.toDataURL('image/png');
      var b64Data = image.replace(/^data:image\/(png|jpg);base64,/, '');
      return b64Data;
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

    onInput: function() {
      this.link = makeLink(false, this.formula);
      this.linkToGithub = makeLink(true, this.formula);
      pjs_formula.save(this.formula);
    },

    //
    // Dropbox methods
    //

    _dropboxFilterEntries: function(entries) {
      //return entries;
      return entries.filter(entry => entry.name.endsWith('.formula'));
    },

    _dropboxError: function(error) {
      alert('ERROR ' + error.response.status + ':\n' + JSON.stringify(error.response.data));
    },

    dropboxLogout: function() {
      this.dropbox.setToken(null);
      this.dropboxLoggedIn = this.dropbox.isLoggedIn();
    },

    dropboxSaveDialog: function() {
      var busy = this.fileDialog.showBusyDialog('Reading files list...');
      this.dropbox.listFolder(null, function(entries) {
        busy.close();
        entries = this._dropboxFilterEntries(entries);
        this.fileDialog.saveFile(entries, this.dropboxSaveFile, this.dropbox);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },

    dropboxSaveFile: function(entries, filename) {
      var busy = this.fileDialog.showBusyDialog('Saving file...');
      var b64Image = this.grabImage();
      this.dropbox.uploadFile(
        filename, this.ending, this.formula, b64Image,
        function(response) {
          busy.close();
        }.bind(this),
        function(error) {
          busy.close();
          this._dropboxError(error);
        }.bind(this)
      );
    },

    dropboxLoadSampleDialog: function() {
      var busy = this.fileDialog.showBusyDialog('Reading files list...');
      this.dropbox.listPublicFolder(null, function(entries) {
        busy.close();
        this.fileDialog.openFileGallery(entries, this.dropboxLoadFileGallery);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },

    dropboxLoadDialog: function() {
      var busy = this.fileDialog.showBusyDialog('Reading files list...');
      this.dropbox.listFolder(null, function(entries) {
        busy.close();
        entries = this._dropboxFilterEntries(entries);
        this.fileDialog.openFile(entries, this.dropboxLoadFile, this.dropbox);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },

    dropboxLoadFile: function(entry) {
      var busy = this.fileDialog.showBusyDialog('Loading file...');
      this.dropbox.downloadFile(entry.id, function(data) {
        busy.close();
        this.formula = data; // <== bim!
        this.runOneFrame();
        pjs_formula.save(this.formula);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },

    dropboxLoadFileGallery: function(entry) {
      var busy = this.fileDialog.showBusyDialog('Loading file...');
      this.dropbox.downloadFilePublic(entry.formula_url, function(data) {
        busy.close();
        this.formula = data.formula; // <== bim!
        this.runOneFrame();
        pjs_formula.save(this.formula);
      }.bind(this), function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this));
    },

  },

  mounted() {
    this.dropboxAllowed = !window.location.href.startsWith('file:');
    this.dropboxLoginUrl = this.dropbox.getLoginUrl();
    this.dropboxLoggedIn = this.dropbox.isLoggedIn();

    // query
    if (this.$route.query.formula) {
      this.formula =  window.atob(this.$route.query.formula);
    } else {
      this.formula = pjs_formula.defaultFormula;
    }
    var play = typeof this.$route.query.play !== "undefined";
    // hash
    if (this.$route.hash) {
      var params = deparam(this.$route.hash.substring(1));
      if (params.access_token) {
        this.dropbox.setToken(params.access_token);
        this.dropboxLoggedIn = this.dropbox.isLoggedIn();
      }
    }
    // dropbox session
    if (this.dropboxAllowed) {
      if (this.dropbox.isLoggedIn()) {
        // check if login still valid
        this.dropbox.loginIfNeeded(function(account_data) {
          this.dropboxLoggedIn = this.dropbox.isLoggedIn();
          this.dropboxDisplayname = account_data.name.display_name;
          this.dropboxProfilePhotoUrl = account_data.profile_photo_url;
        }.bind(this), function() {
          window.location.href = this.dropboxLoginUrl;
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
