/*
 * Glue to Processing.js
 */

var ProcessingJsAdaptor = function() {
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
}
