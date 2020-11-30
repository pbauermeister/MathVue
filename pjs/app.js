/*
 * Vue.js app.
 */

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
    fps: null,
    dropboxManager: null
  },

  methods: {
    printFps: function() {
      setTimeout(function() {
	if (this.running) {
	  this.fps = pjs_adaptor.processingInstance.getFps();
	  this.printFps();
	}
	else {
	  this.fps = null;
	}
      }.bind(this), 500);
    },

    //
    // Animation methods
    //

    run: function(event) {
      this.running = true;
      this.started = true;
      pjs_adaptor.loadSketch(this.formula);
      this.printFps();
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
	this.printFps();
      }
    },

    runOneFrame: function() {
      this.run();
      this.pause();
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
    // Interface to Dropbox
    //
    getFormula: function() {
      return this.formula;
    },

    setFormula: function(formula) {
      this.formula = formula;
      this.runOneFrame();
      pjs_formula.save(this.formula);
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

    onDropboxLoginState: function(dropboxManager) {
      this.$emit('dropbox-login-state', dropboxManager);
    }

  },

  created() {
    // init Dropbox
    if (!window.location.href.startsWith('file:')) {
      this.dropboxManager = DropboxManager(this.onDropboxLoginState,
					   this.getFormula, this.setFormula,
					   this.grabImage, ENDING,
					   this.$route.hash);
    }
  },

  mounted() {
    // query
    if (this.$route.query.formula) {
      this.formula = window.atob(this.$route.query.formula);
    } else {
      this.formula = pjs_formula.defaultFormula;
    }
    var play = typeof this.$route.query.play !== "undefined";

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

