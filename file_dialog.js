/*
 * Mini Vue.js app for file dialogs
 */

function makeFileDialogVue(dialog, entries, ending, onChanged, onReady, onItemSelected) {
    return new Vue({
      el: '#fileDialog',
      
      data: {
        entries: entries,
        filename: "",
        dialog: dialog,
        ending: ending,
      },
      
      methods: {
        loadClicked: function(entry) {
          onItemSelected(entry, this);
        },
        fixName: function() {
          this.filename += '.' + ending;
          onChanged && onChanged(this.filename);
        },
      },
      
      mounted() {
        onReady && onReady();
      }
    });
};

function FileDialog(ending) {
  this.ending = ending;

  this.formatPath = function(entry) {
    return entry.path_display.startsWith('/')
      ? entry.path_display.substring(1)
      : entry.path_display;
  };
  
  this.showBusyDialog = function(message) {
    var dlg = BootstrapDialog.show({
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
    dlg.getModal().removeClass('fade');
    return dlg;
  };

  this.thumbnailHandler = function(id, dataUrl) {
    var elem = document.getElementById(id);
    if (elem)
      elem.setAttribute('src', dataUrl);
  };
  
  this.openFile = function(entries, onItemSelected, storageManager) {
    var that = this;
    var dlg = BootstrapDialog.show({
      animate: false,
      title: 'Dropbox - Load file',
      message: '<div id="fileDialog" class="dialog-file-load-list">' +
        '         <div v-cloak>' +
        '           <button v-for="entry in entries"' +
        '                   class="btn btn-sm button-list-item"' +
        '                   v-on:click="loadClicked(entry)">' +
        '             <div class="float-left  button-list-item-text">{{ dialog.formatPath(entry) }}</div>' +
        '             <div class="float-right button-list-item-image"><img v-bind:id="entry.id"></div>' +
        '           </button>' +
        '           <div v-if="!entries.length" class="dialog-file-empty">No files found</div>' +
        '         </div>' +
        '       </div>',
      onshow: function() {
        vueStarted = true;
        setTimeout(function() {
          // hack: run after dialog really created
          makeFileDialogVue(
            that,
            entries,
            that.ending,
            null,
            function() {
              storageManager.thumbnailsLoader(entries, that.ending, that.thumbnailHandler);
            },
            function(entry, app) {
              dlg.close();
              onItemSelected(entry);
            });
        }, 100);
      }
    });
    dlg.getModal().removeClass('fade');
  };

  this.openFileGallery = function(entries, onItemSelected) {
    var that = this;
    var dlg = BootstrapDialog.show({
      animate: false,
      title: 'Dropbox - Load gallery file',
      message: '<div id="fileDialog" class="dialog-file-load-list">' +
        '         <div v-cloak>' +
        '           <button v-for="entry in entries"' +
        '                   class="btn btn-sm button-list-item"' +
        '                   v-on:click="loadClicked(entry)">' +
        '             <div class="float-left  button-list-item-text">{{ entry.name }}</div>' +
        '             <div class="float-right button-list-item-image">' +
        '               <img style="height: 32px" v-bind:src="entry.thumb_url">' +
        '             </div>' +
        '           </button>' +
        '           <div v-if="!entries.length" class="dialog-file-empty">No files found</div>' +
        '         </div>' +
        '       </div>',
      onshow: function() {
        vueStarted = true;
        setTimeout(function() {
          // hack: run after dialog really created
          makeFileDialogVue(
            that,
            entries,
            that.ending,
            null,
            null,
            function(entry, app) {
              dlg.close();
              onItemSelected(entry);
            });
        }, 100);
      }
    });
    dlg.getModal().removeClass('fade');
  };

  this.saveFile = function(entries, onSave, storageManager) {
    var input_selector = '#dropbox-input-filename';
    var button_selector = '#dialog-file-save-button-save';
    var hint_selector = '#dialog-file-save-hint';
    var names = entries.map(entry => this.formatPath(entry));
    var ending = this.ending;
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
      
      var exists = names.indexOf(name)>-1;
      if (exists)
        button.html('Overwrite');
      else
        button.html('Save');

      var disabled = !name || ending && !name.endsWith('.' + ending);
      button.prop('disabled', disabled);

      var has_hint = disabled && name && ending;
      //hint.text(has_hint ? 'Name must end with .' + ending : null);
      has_hint && hint.show() || hint.hide();
    };
    var watchChange = function() {
      var input = $(input_selector);
      input.on('input', function() { checkChange() });
      input.focusout(function() { defer(function() {setFocus(); }) });
    };
    var that = this;
    var dlg = BootstrapDialog.show({
      animate: false,
      title: 'Dropbox - Save as',
      message: '<div id="fileDialog">' +
        '         <div v-cloak>' +
        '           <div class="dialog-file-save-list">' +
        '             <button v-for="entry in entries"' +
        '                     class="btn btn-sm button-list-item"' +
        '                     v-on:click="loadClicked(entry)">' +
        '               <div class="float-left  button-list-item-text">{{ dialog.formatPath(entry) }}</div>' +
        '               <div class="float-right button-list-item-image"><img v-bind:id="entry.id"></div>' +
        '             </button>' +
        '             <div v-if="!entries.length" class="dialog-file-empty">No files found</div>' +
        '           </div>' +
        '           <input id="dropbox-input-filename" class="form-control dialog-file-save-input" type="text"' +
        '                  v-model:value="filename"' +
        '                  placeholder="Enter file name here or choose from list" autofocus />' +
        '           <span style="display:none" id="dialog-file-save-hint">Name must end with .{{ending}}' +
        '             <span class="badge badge-pill badge-default" style="cursor:pointer"' +
        '               v-on:click="fixName()">Fix it</span>' +
        '           </span>&nbsp;' +
        '         </div>' +
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
          that.app = makeFileDialogVue(
            that,
            entries,
            ending,
            checkChange,
            function() {
              storageManager.thumbnailsLoader(entries, that.ending, that.thumbnailHandler);
            },
            function(entry, app) {
              var path = that.formatPath(entry);
              app.filename = path;
              setFocus();
              checkChange(path);
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
    dlg.getModal().removeClass('fade');
  };
}

