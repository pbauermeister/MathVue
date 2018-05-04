/*
 * Glue to Processing.js
 */

var ProcessingJsAdaptor = function() {

  //
  // Default formula, embeded one, or retrieved from browser storage
  //
  
  this.defaultFormula = `
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
}`.trim();

  // try to retrieve from browser storage
  try {
    autoSavedFormula = localStorage.getItem("mathvue_autosavedformula");
    if (autoSavedFormula && autoSavedFormula.trim()) {
      this.defaultFormula = autoSavedFormula;
    }
  } catch(e) {}

  //
  // Save formula into browser storage
  //
  
  this.saveFormula = function(text) {
    try {
      localStorage.setItem("mathvue_autosavedformula", text.trim());
    } catch(e) {}
  }

  //
  // Processing stuff
  //
  this.processingInstance = null;

  this.loadSketch = function(formula) {
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
    
    // remove border
    canvas.setAttribute("style", "border:none; max-width:100%");
    
    // (re)load processing on canvas
    if(this.processingInstance) {
      this.processingInstance.exit();  // cleanup
    }
    try {
      this.processingInstance = new Processing(canvas, sketch);
      this.processingInstance.loop();
    }
    catch (e){
      alert(e);
    }
  };

  this.switchSketchState = function(on) {
    if (!this.processingInstance) {
      this.processingInstance = Processing.getInstanceById('sketch');
    }
  
    if (on) {
      this.processingInstance.loop();  // call Processing loop() function
    } else {
      this.processingInstance.noLoop(); // stop animation, call noLoop()
    }
  };

  this.grabImage = function() {
    var name = "mathvisionCanvas";
    var canvas = document.getElementById(name);
    var image = canvas.toDataURL('image/png');
    var b64Data = image.replace(/^data:image\/(png|jpg);base64,/, '');
    return b64Data;
  };

}
