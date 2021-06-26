var dropbox_controls_component = Vue.component('Dropbox', {
  props: { manager: Object, control: String, filename: String },

  data: {
    dropboxLoggedIn: false,
    dropboxDisplayName: null,
    dropboxProfilePhotoUrl: null
  },

  methods: {
    loadSamplesDialog: function() {
      this.manager.dropboxLoadSampleDialog();
    },
    saveDialog: function() {
      this.manager.dropboxSaveDialog(this.filename);
    },
    loadDialog: function() {
      this.manager.dropboxLoadDialog();
    },
    sync: function() {
      this.dropboxLoggedIn = this.manager.dropboxLoggedIn;
      this.dropboxDisplayName = this.manager.dropboxDisplayName;
      this.dropboxProfilePhotoUrl = this.manager.dropboxProfilePhotoUrl;
    }
  },

  mounted: function() {
    this.sync();
    this.$parent.$on('dropbox-login-state', function(){
      this.sync();
      this.$forceUpdate();
    }.bind(this))
  },

  template: `
<span>
  <span v-if="control=='LoadSamples'"
	class="badge badge-pill badge-default badge-secondary"
        style="cursor:pointer"
        v-on:click="loadSamplesDialog">
    Load sample
  </span>


  <span v-if="control=='Save'">
    <span v-if="dropboxLoggedIn">
      <span class="badge badge-pill badge-default badge-secondary"
	    style="cursor:pointer"
	    v-on:click="saveDialog">
        Save to Dropbox
      </span>
    </span>
    <span v-else>
      <span class="badge badge-pill badge-disabled badge-secondary">
        Save to Dropbox
      </span>
    </span>
  </span>


  <span v-if="control=='Load'">
    <span v-if="dropboxLoggedIn">
      <span class="badge badge-pill badge-default badge-secondary"
	    style="cursor:pointer"
	    v-on:click="loadDialog">
        Load from Dropbox
      </span>
    </span>
    <span v-else>
      <span class="badge badge-pill badge-disabled badge-secondary">
        Load from Dropbox
      </span>
    </span>
  </span>


  <span v-if="control=='Status'">
    <!-- links when logged in -->
    <div v-if="dropboxLoggedIn">
      <div v-if="dropboxDisplayName">
        <img style="height: 20px" v-bind:src="dropboxProfilePhotoUrl">
        <small>
          {{dropboxDisplayName}}
        </small>
        |
        <small>
          <a href="https://www.dropbox.com/home/Apps/MathVue"
	     target="_blank">
            MathVue folder <i class="fas fa-external-link-alt"></i></a>
        </small>
        |
        <small>
          <div class="badge badge-pill badge-default badge-secondary"
	       style="cursor:pointer"
	       v-on:click="manager.dropboxLogout">
            Logout
          </div>
        </small>
      </div>
      <div v-if="!dropboxDisplayName"
	   style="display: inline-block;"
	   class="progress">
        <div class="progress-bar progress-bar-striped progress-bar-animated"
             role="progressbar" style="width: 100%; padding: 0 10px;">
          Getting account infos...
        </div>
      </div>
    </div>

    <!-- login link when logged out -->
    <div v-if="!dropboxLoggedIn">
      Please
      <a class="badge badge-pill badge-default badge-secondary"
	 v-bind:href="manager.dropboxLoginUrl">
	Login to Dropbox
      </a>
      to access your Dropbox account.
    </div>
    <!-- hint when noi Dropbox possible -->
    <div v-if="!manager">
      Cannot access Dropbox when running from file://
    </div>
  </span>
</span>
`
});
