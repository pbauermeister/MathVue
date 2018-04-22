
dropbox = {

  getLoginUrl: function() {
    var mathvue_client_id = '65hebhcza1whb68';
    var this_urlbase = 'http://localhost:3001/';
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

  loginIfNeeded: function(then) {
    var token = this.getToken();
    var loginUrl = this.getLoginUrl();
    var that = this;
    this.checkToken(token)
      .then((response) => {
        then(response.data);
      })
      .catch((error) => {
        //alert("chk err");
        that.setToken(null);
        window.location.href = loginUrl;
      });
  }
}
