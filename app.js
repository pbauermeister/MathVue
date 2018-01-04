/*
 * Vue.js app.
 */

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
    linkToGithub: makeLink(true, defaultFormula)
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
    }
  },

  mounted() {
    if (this.$route.query.formula) {
      this.formula =  window.atob(this.$route.query.formula);
    } else {
      this.formula = defaultFormula;
    }

    var play =  typeof this.$route.query.play !== "undefined";
    if (play) {
      this.run(null);
    }

    this.$router.push("");
  }
});

function makeLink(toGithub, formula) {
  var base = toGithub
      //? "http://htmlpreview.github.io/?https://github.com/pbauermeister/MathVue/blob/master/index.html"
      ? "https://rawgit.com/pbauermeister/MathVue/master/index.html"
      : "";
  return base + "?formula=" + window.btoa(formula) + "&play";
}
