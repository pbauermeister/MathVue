var defaultFormula = `WIDTH = 200;
RATIO = 1;
X_MIN = 0; X_MAX = 10;
Y_MIN = 0; Y_MAX = 10;

color rgb(x, y) {
  float value = (int)x % 2 == (int)y % 2;
  float luma = value * 255;
  return color(luma);
}`;

var app = new Vue({
  el: '#app',

  data: {
    message: 'Hello MathVue! With Bootstrap 4.0.',
    formula: defaultFormula
  },

  methods: {
    run: function (event) {
      alert("Run:\n" + this.formula);
    }
  }
})
