var statusdialog_component = Vue.component('statusdialog', {
  data: function () {
    return {
      modalVisible: false,
      modalTitle: null,
      modalBody: null,
      modalBodyHtml: null
    }
  },
  mounted: function() {
  },

  methods: {
    show: function(title, body) {
      var modal = this.$refs.modal;
      this.modalTitle = title;
      this.modalBody = body;
      this.modalBodyHtml = null;
      modal.size = 'sm';
      console.log(Object.keys(modal))
      modal.show();
    },
    showError: function(error) {
      let context = error.request
	  ? [error.request.responseURL, error.request.statusText].join(' ').trim()
	  : null;
      let msg = String(error || error.response || error.response.data ||
		       error.response.data.error);
      console.error(msg)
      var modal = this.$refs.modal;
      this.modalTitle = 'Error';
      var cmd = msg.cmd;
      var body;
      if (cmd) {
	var stderr = msg.stderr;
	var stdout = msg.stdout
	this.modalBody = null;
	this.modalBodyHtml = (`command: <pre>${msg.cmd}</pre>` +
			      `code:    <pre>${msg.code}</pre>`+
                              `stdout:  <pre>${msg.stdout}</pre>`+
                              `stderr:  <pre>${msg.stderr}</pre>`);
	modal.size = 'xl';
      }
      else {
	if (context) {
	  msg = String(msg);
	  this.modalBody = null;
	  this.modalBodyHtml = `<div>${context}</div><br/><div>${msg}</div>`;
	}
	else {
	  this.modalBody = msg;
	  this.modalBodyHtml = null;
	}
	modal.size = 'md';
      }
      modal.show();
    },
    hide: function() {
      var modal = this.$refs.modal;
      modal.hide();
    },
    escapeHtml: function(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  },
  template: `
<div>
  <b-modal hide-footer ok-only scrollable ref="modal"
           :hide-header="!modalTitle"
           :title="modalTitle"
           >{{modalBody}}<span v-html="modalBodyHtml"></span></b-modal>
</div>`
});
