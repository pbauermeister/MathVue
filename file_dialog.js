/*
 * Mini Vue.js app for file dialogs
 */

var makeFileDialogVue = function(entries, onItemSelected) {
    return new Vue({
      el: '#fileDialog',
      
      data: {
        entries: entries,
        filename: "",
      },
      
      methods: {
        loadClicked: function (entry) {
          onItemSelected(entry, this);
        },
      },
      
      mounted() {
      }
    });
};

var fileDialog = {

  showBusyDialog: function(message) {
    return BootstrapDialog.show({
      message: message +
        '<div class="progress">' +
        '  <div class="progress-bar progress-bar-striped progress-bar-animated"' +
        '       role="progressbar" style="width: 100%">' +
        '  </div>' +
        '</div>',
      animate: true,
      size: BootstrapDialog.SIZE_SMALL
    });
  },
  
  openFile: function(entries, onItemSelected) {
    var dropboxDialog = BootstrapDialog.show({
      animate: false,
      title: 'Choose a file from Dropbox',
      message: '<div id="fileDialog" class="dialog-file-load-list">' +
        '         <button v-for="entry in entries"' +
        '                 class="btn btn-sm button-list-item"' +
        '                 v-on:click="loadClicked(entry)">' +
        '           {{ entry.name }}' +
        '         </button>' +
        '       <div v-if="!entries.length" class="dialog-file-empty">No files found</div>' +
        '       </div>',
      onshow: function() {
        vueStarted = true;
        setTimeout(function() {
          // hack: run after dialog really created
          makeFileDialogVue(entries,
                            function(entry, app) {
                              dropboxDialog.close();
                              onItemSelected(entry);
                            });
        }, 100);
      }
    });
  },

  saveFile: function(entries, onSave) {
    var that = this;
    var dropboxDialog = BootstrapDialog.show({
      animate: false,
      title: 'Enter file name to save to Dropbox',
      message: '<div id="fileDialog">' +
        '         <div class="dialog-file-save-list">' +
        '           <button v-for="entry in entries"' +
        '                   class="btn btn-sm button-list-item"' +
        '                   v-on:click="loadClicked(entry)">' +
        '             {{ entry.name }}' +
        '           </button>' +
        '           <div v-if="!entries.length" class="dialog-file-empty">No files found</div>' +
        '         </div>' +
        '         <input class="form-control dialog-file-save-input" type="text"' +
        '                v-model:value="filename"' +
        '                placeholder="Enter file name here" autofocus />' +
        '       </div>',
      buttons: [
        {
          label: 'Cancel',
          cssClass: 'btn-sm',
          action: function(dlg) { dlg.close() }
        },
        {
          label: 'Save',
          cssClass: 'btn-primary btn-sm',
          action: function(dlg) {
            var filename = that.app.filename;
            if (filename) {
              dlg.close();
              onSave(entries, filename);
            }
          }
        }],
      onshow: function() {
        vueStarted = true;
        setTimeout(function() {
          // hack: run after dialog really created
          that.app = makeFileDialogVue(entries,
                                       function(entry, app) {
                                         app.filename = entry.name;
                                         // TODO focus input
                                       });
        }, 100);
      }
    });
  }

};
