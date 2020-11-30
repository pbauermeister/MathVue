/*
 * Vue.js app.
 */

const ENDING = 'formula';

var router = new VueRouter({
  mode: 'history',
  routes: []
});

var processingjsAdaptor = new ProcessingJsAdaptor();
var browserFormulaStorage = new BrowserFormulaStorage(ENDING,`
WIDTH = 300;
RATIO = 1;
X_MIN = -20; X_MAX = 20;
Y_MIN = -20; Y_MAX = 20;
MOUSE_MOVE = true;

color hsb(x, y) {
  float d = dist(u, v, mouseX, mouseY) / WIDTH * 10;
  float shift = mouseX / WIDTH;

  float bright = (1/d) * 255;
  float hue = shift * 255;

  return color(hue, 255, bright);
}`);

var app = new Vue({
  router,
  el: '#app',

  data: {
    formula: null,
    running: false,
    started: false,
    link: makeLink(false, browserFormulaStorage.defaultFormula),
    linkToGithub: makeLink(true, browserFormulaStorage.defaultFormula),
    fps: null,
    dropboxManager: null
  },

  methods: {
    printFps: function() {
      setTimeout(function() {
	if (this.running) {
	  this.fps = processingjsAdaptor.processingInstance.getFps();
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
      processingjsAdaptor.loadSketch(this.formula);
      this.printFps();
    },

    pause: function(event) {
      this.running = false;
      processingjsAdaptor.switchSketchState(false);
    },

    resume: function(event) {
      if (!this.started) {
        this.run();
      } else {
        this.running = true;
        processingjsAdaptor.switchSketchState(true);
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
      browserFormulaStorage.save(this.formula);
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
      browserFormulaStorage.save(this.formula);
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
      this.formula = browserFormulaStorage.defaultFormula;
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

