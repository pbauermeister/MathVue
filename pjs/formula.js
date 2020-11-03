/*
 * Formula
 */

var ProcessingJsFormula = function() {

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

  this.save = function(text) {
    try {
      localStorage.setItem("mathvue_autosavedformula", text.trim());
    } catch(e) {}
  }
}
