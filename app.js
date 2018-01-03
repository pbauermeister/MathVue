/*
 * Vue.js app.
 */

var app = new Vue({
  el: '#app',

  data: {
    message: 'Hello MathVue! With Bootstrap 4.0.',
    formula: defaultFormula,
    running: false,
    started: false
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
    }
  }
});
