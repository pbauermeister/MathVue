
dropbox = {

  getLoginUrl: function() {
    var mathvue_client_id = '65hebhcza1whb68';

    var this_urlbase = window.location;
    return ('https://www.dropbox.com/oauth2/authorize?client_id='+ mathvue_client_id
            + '&response_type=token'
            + '&redirect_uri=' + this_urlbase);
  },

  setToken: function(access_token) {
    window.localStorage.setItem('dropbox_accesstoken', access_token || '');
  },

  getToken: function() {
    return window.localStorage.getItem('dropbox_accesstoken');
  },

  isLoggedIn: function() {
    return !!this.getToken();
  },

  checkToken: function(access_token) {
    return axios({
      method: 'POST',
      url: 'https://api.dropboxapi.com/2/users/get_current_account',
      headers: {Authorization: 'Bearer ' + access_token},
    });
  },

  loginIfNeeded: function(onSuccess, onError) {
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
  },

  listFolder: function(cursor, onResponse, onError, entries) {
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
          var entries = entries.sort((a, b) => a.path_display > b.path_display);
          onResponse(entries);
        }
      },
      (error) => {
        onError(error);
      });
  },

  getThumbnailDataUrl: function(entry, onResponse) {
    var thumbPath = entry.path_display.replace(/[.]formula$/, '.png');
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
  },

  downloadFile: function(id, onResponse, onError) {
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
  },

  uploadFile: function(filename, text, b64Image,
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
        var filename2 = filename.replace(/[.]formula$/, '.png');
        console.log(filename);
        console.log(filename2);
        this.uploadImage(filename2, b64Image, onResponse, onError);
      }.bind(this),
      (error) => {
        console.log(error);
        onError(error);
      });
  },

  uploadImage: function(filename, b64Image,
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
  },
  
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
