
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

  listFiles: function(cursor, onResponse, onError, entries) {
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
          that.listFiles(response.data.cursor, onResponse, onError, entries)
        else
          onResponse(entries.sort());
      },
      (error) => {
        onError(error);
      });
  },

  getFile: function(id, onResponse, onError) {
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
  }
  
}
