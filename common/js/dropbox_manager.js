function DropboxManager(onLoginStateCB,
			getFormulaCB, setFormulaCB,
			grabImageCB,
			ending, urlHash) {
  this.dropboxStorage = new DropboxStorage(ending);
  this.dropboxLoginUrl = this.dropboxStorage.getLoginUrl();
  this.dropboxLoggedIn = this.dropboxStorage.isLoggedIn();

  this.dropboxProfilePhotoUrl = null;
  this.dropboxDisplayName = null;
  this.dropboxFiles = [];
  this.dropboxDialog = null;

  this.fileDialog = new FileDialog(ending);

  function deparam(querystring) {
    // remove any preceding url and split
    querystring = querystring.substring(querystring.indexOf('?')+1).split('&');
    var params = {}, pair, d = decodeURIComponent, i;
    // march and parse
    for (i = querystring.length; i > 0;) {
      pair = querystring[--i].split('=');
      params[d(pair[0])] = d(pair[1]);
    }
    return params;
  };

  //
  // Session & url hash
  //

  if (urlHash) {
    var params = deparam(urlHash.substring(1));
    if (params.access_token) {
      this.dropboxStorage.setToken(params.access_token);
      this.dropboxLoggedIn = this.dropboxStorage.isLoggedIn();
      onLoginStateCB(this);
    }
  }
  // dropbox session
  if (this.dropboxStorage.isLoggedIn()) {
    // check if login still valid
    this.dropboxStorage.loginIfNeeded(function(account_data) {
      this.dropboxLoggedIn = this.dropboxStorage.isLoggedIn();
      this.dropboxDisplayName = account_data.name.display_name;
      this.dropboxProfilePhotoUrl = account_data.profile_photo_url;
      onLoginStateCB(this);
    }.bind(this), function() {
      window.location.href = this.dropboxLoginUrl;
    }.bind(this));
  }

  //
  // Dropbox methods
  //

  this._dropboxFilterEntries = function(entries) {
    //return entries;
    return entries.filter(entry => entry.name.endsWith('.' + ending));
  };

  this._dropboxError = function(error) {
    alert('ERROR '
	  + error.response.status
	  + ':\n'
	  + JSON.stringify(error.response.data));
  };

  this.dropboxLogout = function() {
    this.dropboxStorage.setToken(null);
    this.dropboxLoggedIn = this.dropboxStorage.isLoggedIn();
    onLoginStateCB(this);
  };

  this.dropboxSaveDialog = function() {
    var busy = this.fileDialog.showBusyDialog('Reading files list...');
    this.dropboxStorage.listFolder(null, function(entries) {
      busy.close();
      entries = this._dropboxFilterEntries(entries);
      this.fileDialog.saveFile(entries, this.dropboxSaveFile, this.dropboxStorage);
    }.bind(this), function(error) {
      busy.close();
      this._dropboxError(error);
    }.bind(this));
  };

  this.dropboxSaveFile = function(entries, filename) {
    var busy = this.fileDialog.showBusyDialog('Saving file...');
    var b64Image = grabImageCB();
    this.dropboxStorage.uploadFile(
      filename, ending, getFormulaCB(), b64Image,
      function(response) {
        busy.close();
      }.bind(this),
      function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this)
    );
  };

  this.dropboxLoadSampleDialog = function() {
    var busy = this.fileDialog.showBusyDialog('Reading files list...');
    this.dropboxStorage.listPublicFolder(
      null,
      function(entries) {
        busy.close();
        this.fileDialog.openFileGallery(entries, this.dropboxLoadFileGallery);
      }.bind(this),
      function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this)
    );
  };

  this.dropboxLoadDialog = function() {
    var busy = this.fileDialog.showBusyDialog('Reading files list...');
    this.dropboxStorage.listFolder(null, function(entries) {
      busy.close();
      entries = this._dropboxFilterEntries(entries);
      this.fileDialog.openFile(entries, this.dropboxLoadFile, this.dropboxStorage);
    }.bind(this), function(error) {
      busy.close();
      this._dropboxError(error);
    }.bind(this));
  };

  this.dropboxLoadFile = function(entry) {
    var busy = this.fileDialog.showBusyDialog('Loading file...');
    this.dropboxStorage.downloadFile(entry.id, function(data) {
      busy.close();
      setFormulaCB(data);
    }.bind(this), function(error) {
      busy.close();
      this._dropboxError(error);
    }.bind(this));
  };

  this.dropboxLoadFileGallery = function(entry, then) {
    var busy = this.fileDialog.showBusyDialog('Loading file...');
    this.dropboxStorage.downloadFilePublic(entry.formula_url, function(data) {
      busy.close();
      setFormulaCB(data.formula);
      if (then) then();
    }.bind(this), function(error) {
      busy.close();
      this._dropboxError(error);
    }.bind(this));
  };

  this.dropboxLoadSampleLike = function(startswith, then) {
    var busy = this.fileDialog.showBusyDialog('Reading files list...');
    this.dropboxStorage.listPublicFolderLike(
      startswith,
      function(entries) {
        busy.close();
	if (entries.length) {
	  let entry = entries[entries.length-1];
	  this.dropboxLoadFileGallery(entry, then);
	}
	else alert('No gallery formula starting with "'+startswith+'"');
      }.bind(this),
      function(error) {
        busy.close();
        this._dropboxError(error);
      }.bind(this)
    );
  };

  return this;
}
