function CommentHeader() {
  this.regex = RegExp('^//\\s*file:\\s*([^\n]*)\\s*$', 'im');

  this.patchCommentFromFilename = function(text, filename) {
    if (this.regex.test(text)) {
      // replace comment
      return text.replace(this.regex, '// File: ' + filename);
    }
    else {
      // insert comment
      return '// File: ' + filename + '\n' + text;
    }
  };

  this.extractFilenameFromFormula = function(text) {
    console.log("text:", text);
    if (this.regex.test(text)) {
      return text.match(this.regex)[1]
    }
    else {
      return ".c";
    }
  };
}
