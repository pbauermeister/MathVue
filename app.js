// default formula
var defaultFormula = `
WIDTH = 250;
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
}
`.trim();

// Processing stuff

var processingInstance = null;

function loadSketch(formula) {
  // assemble a full PDE out of the user formula and mathvision template
  var patt = new RegExp("Start of user formula @@@(.|\n)*?"+
                        "End of user formula @@@", "gm");
  // TODO: clean formula from code injection and remove /*...*/ comments
  var text = "Start of user formula @@@\n"+ formula +
      "\n// End "+"of user formula @@@";

  // compile it by Processing.js
  var code = mathVisionTemplate.replace(patt, text); // TODO: use function to avoid \1
  var sketch = Processing.compile(code);
  var canvas = document.getElementById("mathvisionCanvas");

  // (re)load processing on canvas
  if(processingInstance) {
    processingInstance.exit();  // cleanup
  }
  try {
    processingInstance = new Processing(canvas, sketch);
    processingInstance.loop();
  }
  catch (e){
    alert(e);
  }
}

// Bindings to the web page, through Vue.js
var app = new Vue({
  el: '#app',

  data: {
    message: 'Hello MathVue! With Bootstrap 4.0.',
    formula: defaultFormula
  },

  methods: {
    run: function (event) {
      loadSketch(this.formula);
    }
  }
})

// Loading of the MathVision PDE template
var mathVisionTemplate = "";
var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
  if (xhr.readyState == 4) {
    if (xhr.status == 200) {
      mathVisionTemplate = xhr.responseText;
    } else {
      alert("Could not load the MathVision PDE template.");
    }
  }
};
xhr.open("GET", "mathvision-template.pde");
xhr.send();
