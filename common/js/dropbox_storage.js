
function DropboxStorage(ending) {

  this.getLoginUrl = function() {
    var mathvue_client_id = '65hebhcza1whb68';

    var this_urlbase = window.location;
    return ('https://www.dropbox.com/oauth2/authorize?client_id='+ mathvue_client_id
            + '&response_type=token'
            + '&redirect_uri=' + this_urlbase);
  };

  this.setToken = function(access_token) {
    window.localStorage.setItem('dropbox_accesstoken', access_token || '');
  };

  this.getToken = function() {
    return window.localStorage.getItem('dropbox_accesstoken');
  };

  this.isLoggedIn = function() {
    return !!this.getToken();
  };

  this.checkToken = function(access_token) {
    return axios({
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/users/get_current_account',
      headers: {Authorization: 'Bearer ' + access_token},
    });
  };

  this.loginIfNeeded = function(onSuccess, onError) {
    var token = this.getToken();
    var loginUrl = this.getLoginUrl();
    var that = this;
    this.checkToken(token)
      .then((response) => {
        onSuccess(response.data);
      })
      .catch((error) => {
        // TODO: distinguish errors: invalid login, from other errors
        that.setToken(null);
        onError();
      });
  };

  this.listFolder = function(cursor, onResponse, onError, entries) {
    var that = this;
    var params = {
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/files/list_folder',
      data: {path: '', recursive: true, include_media_info: true},
      headers: {Authorization: 'Bearer ' + this.getToken()},
    };
    if (cursor) {
      params.url += '/continue';
      params.data = {cursor: cursor};
    }
    axios(params).then(
      (response) => {
        if (response.data.entries && response.data.entries.length)
          entries = (entries ? entries : []).concat(response.data.entries);
        if (response.data.has_more)
          that.listFolder(response.data.cursor, onResponse, onError, entries)
        else {
	  function fixup(s) {
	    // append '/' if file is at root, to list files before dirs
	    return (s.split('/').length == 2 && s[0] == '/') ? '/' + s : s;
	  }
          var sortedEntries = entries.sort(
	    (a, b) => fixup(a.path_lower) > fixup(b.path_lower) ? 1 : -1
	  );
          console.log(sortedEntries);
          onResponse(sortedEntries);
        }
      },
      (error) => {
        onError(error);
      });
  };

  this.listPublicFolder = function(cursor, onResponse, onError) {
    var that = this;
    var params = {
      method: 'GET',
      url: '/api/gallery/' + ending,
    };
    axios(params).then(
      (response) => {
        var entries = response.data.entries.sort(
	  (a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1
	);
        console.log(entries);
        onResponse(entries);
      },
      (error) => {
        onError(error);
      });
  };

  this.getThumbnailDataUrl = function(entry, ending, onResponse) {
    var re = new RegExp('[.]' + ending + '$');
    var thumbPath = entry.path_display.replace(re, '.png');
    var format = 'png';
    var params = {
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/get_thumbnail',
      responseType: 'arraybuffer',
      headers: {
        Authorization: 'Bearer ' + this.getToken(),
        'Dropbox-API-Arg': JSON.stringify({
          path: thumbPath,
          format: format,
          size: 'w32h32',
          mode: 'fitone_bestfit',
        }),
      },
    };
    axios(params).then(
      (response) => {
        var data64 = _arrayBufferToBase64(response.data);
        var dataUrl = 'data:image/' + format + ';base64,' + data64;
        onResponse(dataUrl);
      },
      (error) => {}
    );
  };

  this.downloadFile = function(id, onResponse, onError) {
    var params = {
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/download',
      headers: {
        Authorization: 'Bearer ' + this.getToken(),
        'Dropbox-API-Arg': JSON.stringify({path: id}),
      },
    };
    axios(params).then(
      (response) => {
        onResponse(response.data);
      },
      (error) => {
        onError(error);
      });
  };

  this.downloadFilePublic = function(url, onResponse, onError) {
    var params = {
      method: 'GET',
      url: '/api/gallery/url/' + encodeURIComponent(url),
    };
    console.log(params.url);
    axios(params).then(
      (response) => {
        onResponse(response.data);
      },
      (error) => {
        onError(error);
      });
  };

  this.uploadFile = function(filename, ending, text, b64Image,
                             onResponse, onError) {
    var uploadParams = {
      mode: 'overwrite',
      path: '/' + filename,
      autorename: false,
    };
    var params = {
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/upload',
      headers: {
        Authorization: 'Bearer ' + this.getToken(),
        'Dropbox-API-Arg': JSON.stringify(uploadParams),
        'Content-Type': 'text/plain; charset=dropbox-cors-hack',
        'Content-Type': 'application/octet-stream',
      },
      data: new TextEncoder("utf-8").encode(text),
    };
    axios(params).then(
      function(response) {
        //onResponse(response);
        var re = new RegExp('[.]' + ending + '$');
        var filename2 = filename.replace(re, '.png');
        this.uploadImage(filename2, b64Image, onResponse, onError);
      }.bind(this),
      (error) => {
        console.log(error);
        onError(error);
      });
  };

  this.uploadImage = function(filename, b64Image,
                              onResponse, onError) {
    var uploadParams = {
      mode: 'overwrite',
      path: '/' + filename,
      autorename: false,
    };
    var params = {
      method: 'POST',
      url: 'https://content.dropboxapi.com/2/files/upload',
      headers: {
        Authorization: 'Bearer ' + this.getToken(),
        'Dropbox-API-Arg': JSON.stringify(uploadParams),
        'Content-Type': 'application/octet-stream',
      },
    };

    // b64->bytes: https://stackoverflow.com/a/49273187
    var req = new XMLHttpRequest;
    req.open('GET', "data:application/octet;base64," + b64Image);
    req.responseType = 'arraybuffer';
    req.onload = function fileLoaded(e)
    {
      var byteArray = new Int8Array(e.target.response);

      params.data = byteArray;
      axios(params).then(onResponse, onError);
    }
    req.send();
  };

  this.thumbnailsCache = {};
  this.thumbnailsLoader = function(entries, ending, thumbnailHandler) {
    entries.forEach(function(entry) {
      var cached = this.thumbnailsCache[entry.id]; // use cache
      if (cached) thumbnailHandler(entry.id, cached);
      this.getThumbnailDataUrl(entry, ending, function(dataUrl) {
        this.thumbnailsCache[entry.id] = dataUrl; // set cache
        thumbnailHandler(entry.id, dataUrl);
      }.bind(this));
    }.bind(this));
  };

}


function _arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
