Vue.component("Editor", {
  template: '<div :id="editorId" style="width: 100%; height: 100%;"></div>',
  props: ["editorId", "content", "lang", "theme"],
  data() {
    return {
      editor: Object,
      beforeContent: "",
    };
  },
  watch: {
    content(value) {
      if (this.beforeContent !== value) {
        this.editor.setValue(value, 1);
      }
    },
  },
  mounted() {
    const lang = this.lang || "c_cpp";
    const theme = this.theme || "github";

    this.editor = window.ace.edit(this.editorId);
    this.editor.setValue(this.content, 1);

    //this.editor.getSession().setMode(`ace/mode/${lang}`)
    this.editor.setTheme(`ace/theme/${theme}`);

    this.editor.setOptions({
      fontFamily: "monospace",
      fontSize: "0.75em",
    });

    this.editor.on("change", () => {
      this.beforeContent = this.editor.getValue();
      this.$emit("change-content", this.editor.getValue());
    });
  },
});
