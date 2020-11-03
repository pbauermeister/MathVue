var help_component = Vue.component('Help', {

  props: { markdown_path: String },

  data: function() {
    return {
      md: null
    };
  },

  computed: {
    help: function() {
      if (!this.md)
	return ["", ""];

      let md = this.md.replace(/[«»]/g, '`');
      let parts = md.split('__________');

      let head = parts[0].trim();
      let body = parts[1].trim();
      return [this.conv.makeHtml(head), this.conv.makeHtml(body)];
    }
  },

  mounted: function() {
    this.conv = new showdown.Converter();
    this.conv.setOption('tables', true);

    axios.get(this.markdown_path)
      .then((response) => {
	this.md = response.data;
      })
      .catch((error) => {
        console.error(error);
      });
  },

  template: `
<div class="wrap-collabsible">
  <input id="collapsible" class="toggle" type="checkbox">
  <label for="collapsible" class="lbl-toggle">Formula syntax</label>
  <div class="collapsible-content">
    <div class="content-inner">

      <div class="card">
        <div class="card-header p-2">
          <div v-html="help[0]"></div>
        </div>
        <div class="card-body p-2">
	  <!-- https://stackoverflow.com/a/45844579 -->
	  <div class="d-block d-sm-none"> <!-- XS -->
	    <div class="md columns-1" v-html="help[1]"></div>
	  </div>
	  <div class="d-none d-sm-block d-md-none"> <!-- SM -->
	    <div class="md columns-1" v-html="help[1]"></div>
	  </div>
	  <div class="d-none d-md-block d-lg-none"> <!-- MD -->
	    <div class="md columns-1" v-html="help[1]"></div>
	  </div>
	  <div class="d-none d-lg-block d-xl-none"> <!-- LG -->
	    <div class="md columns-2" v-html="help[1]"></div>
	  </div>
	  <div class="d-none d-xl-block"> <!-- XL -->
	    <div class="md columns-3" v-html="help[1]"></div>
	  </div>
        </div>
      </div>
    </div>
  </div>
</div>
`
});
