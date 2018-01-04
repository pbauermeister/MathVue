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
    link: makeLink(defaultFormula)
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
      this.link = makeLink(this.formula);
      saveFormula(this.formula);
    }
  },

  created() {
    this.formula = this.$route.query.formula
      ? this.$route.query.formula
      : defaultFormula;
  }
});

function makeLink(formula) {
  var base = "http://htmlpreview.github.io/?https://github.com/pbauermeister/MathVue/blob/master/index.html";
  return base + "?formula=" + encodeURIComponent(formula);
}
