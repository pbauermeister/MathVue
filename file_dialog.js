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
      title: 'Dropbox',
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
      title: 'Dropbox - Load file',
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
    var input_selector = '#dropbox-input-filename';
    var button_selector = '#dialog-file-save-button-save';
    var hint_selector = '#dialog-file-save-hint';
    var names = entries.map(entry => entry.name);
    var setFocus = function() {
      $(input_selector).focus();
    }
    var defer = function(f, delay) {
      setTimeout(function() { f(); }, delay || 100);
    };
    var checkChange = function(name) {
      var input = $(input_selector);
      var button = $(button_selector);
      var hint = $(hint_selector);

      name = (name || input.val()).trim();

      button.html(names.indexOf(name)==-1 ? 'Save' : 'Overwrite');
      var disabled = !name || !name.endsWith('.formula');
      button.prop('disabled', disabled);
      button.attr('title', disabled ? 'Name must end with .formula' : null);
      hint.text(disabled ? 'Name must end with .formula' : null);
   };
    var watchChange = function() {
      var input = $(input_selector);
      input.on('input', function() { checkChange() });
      input.focusout(function() { defer(function() {setFocus(); }) });
    };
    var that = this;
    var dropboxDialog = BootstrapDialog.show({
      animate: false,
      title: 'Dropbox - Save as',
      message: '<div id="fileDialog">' +
        '         <div class="dialog-file-save-list">' +
        '           <button v-for="entry in entries"' +
        '                   class="btn btn-sm button-list-item"' +
        '                   v-on:click="loadClicked(entry)">' +
        '             {{ entry.name }}' +
        '           </button>' +
        '           <div v-if="!entries.length" class="dialog-file-empty">No files found</div>' +
        '         </div>' +
        '         <input id="dropbox-input-filename" class="form-control dialog-file-save-input" type="text"' +
        '                v-model:value="filename"' +
        '                placeholder="Enter file name here or choose from list" autofocus />' +
        '         <div><span id="dialog-file-save-hint"></span>&nbsp;</div>' +
        '       </div>',
      buttons: [
        {
          label: 'Cancel',
          cssClass: 'btn-sm',
          action: function(dlg) { dlg.close() }
        },
        {
          id: 'dialog-file-save-button-save',
          label: 'Save',
          cssClass: 'btn-primary btn-sm',
          action: function(dlg) {
            var filename = that.app.filename.trim();
            if (filename) {
              dlg.close();
              onSave(entries, filename);
            } else {
              setFocus();
            }
          }
        }],
      onshow: function() {
        vueStarted = true;
        defer(function() {
          // hack: run after dialog really created
          that.app = makeFileDialogVue(entries,
                                       function(entry, app) {
                                         app.filename = entry.name;
                                         setFocus();
                                         checkChange(entry.name);
                                       });
        });

        defer(function() {
          // ugly hack: run after Vue.js has rendered
          setFocus();
          watchChange();
          checkChange();
        }, 800);

      }
    });
  }

};
