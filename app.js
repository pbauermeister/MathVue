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
      this.running = true;
      switchSketchState(true);
    },
    onInput: function () {
      this.link = makeLink(false, this.formula);
      this.linkToGithub = makeLink(true, this.formula);
      saveFormula(this.formula);
    }
  },

  mounted() {
    if (this.$route.query.formula) {
      this.formula = this.$route.query.formula;
      
    } else {
      this.formula = defaultFormula;
    }

    var play =  typeof this.$route.query.play !== "undefined";
    if (play) {
      this.run(null);
    }

    if (window.location.hostname.indexOf(".github") === -1) {
      this.$router.push("");
    }
  }
});

function makeLink(toGithub, formula) {
  var base = toGithub
      ? "http://htmlpreview.github.io/?https://github.com/pbauermeister/MathVue/blob/master/index.html"
      : "";
  return base + "?formula=" + encodeURIComponent(formula) + "&play";
}
