/*
 * Formula
 */

var BrowserFormulaStorage = function (ending, defaultFormula) {
  //
  // Default formula, embeded one, or retrieved from browser storage
  //

  this.defaultFormula = defaultFormula.trim();
  this.itemName = "mathvue_autosavedformula_" + ending;

  // try to retrieve from browser storage
  try {
    autoSavedFormula = localStorage.getItem(this.itemName);
    if (autoSavedFormula && autoSavedFormula.trim()) {
      this.defaultFormula = autoSavedFormula;
    }
  } catch (e) {}

  //
  // Save formula into browser storage
  //

  this.save = function (text) {
    console.log("*save");
    try {
      localStorage.setItem(this.itemName, text.trim());
    } catch (e) {}
  };
};
