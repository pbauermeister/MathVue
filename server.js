const express = require('express');
const https = require("https");
const app = express()
const request = require('request');
const util = require('util');
var exec = require('child_process').exec;
var execFile = require('child_process').execFile;

const exec_async = util.promisify(require('child_process').exec);

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json()

////////////////////////////////////////////////////////////////////////////////

//
// logging
// https://dev.to/brightdevs/http-request-logging-in-nodejs-42od
//
const logRequestStart = (req, res, next) => {
  console.info(`${req.method} ${req.originalUrl}`);
  next();
}

app.use(logRequestStart);

//
// Parameters
//

const message = 'MathVue app (a Node.js backend) listening on port 3001!';
// Public page: https://www.dropbox.com/sh/18v296344ohwyiy/AADyygfek6SDwHbk6i4PS7Zya?dl=0
const GALLERY_PAGE_URL_BASE = 'https://www.dropbox.com/sh/18v296344ohwyiy/';
const GALLERY_PAGE_URL = GALLERY_PAGE_URL_BASE + 'AADyygfek6SDwHbk6i4PS7Zya?dl=0';

const EXT_FORMULA = 'formula';
const EXT_THUMB = 'png';
const PARTS_RX = new RegExp('.*?/([^/]+)[.]([^/]+)$');

//
// Helpers
//

Array.prototype.unique = function() {
  return this.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
};

const END_OF_EXT = '(?=[?\'])';
const FILE_NAME = '[^\'"\\:#]+[.]';
function mkUrlRegExp(ext) {
  return new RegExp(GALLERY_PAGE_URL_BASE + FILE_NAME + ext + END_OF_EXT, 'g');
}

function rxMatches(text, rx) {
  var matches = text.match(rx);
  return matches ? matches.unique() : [];
}

//
// Dropbox endpoints
//

// This endpoint fetches the formula and thumbnails of the author's
// gallery.
//
// It is implemented this way in the backend because the API does not
// work as needed for public folders.
//
const GALLERY_FORMULA_RX = mkUrlRegExp(EXT_FORMULA);
const GALLERY_THUMB_RX = mkUrlRegExp(EXT_THUMB);
app.get('/api/gallery', async function(req, res) {
  var options = {
    host: 'www.dropbox.com',
    path: GALLERY_PAGE_URL,
  };

  //console.log('ask dropbox');
  var req2 = https.get(options, function(res2) {
    var bodyChunks = [];
    res2.on('data', function(chunk) {
      bodyChunks.push(chunk);
    }).on('end', function() {
      var body = "" + Buffer.concat(bodyChunks);
      //console.log("----------------------");
      //console.log(body);
      //console.log("----------------------");

      // formula and thumbnail urls
      var formula_matches = rxMatches(body, GALLERY_FORMULA_RX);
      var thumb_matches = rxMatches(body, GALLERY_THUMB_RX);
      // assemble items list
      var entries = formula_matches.map(function(formula) {
        // look for corresponding thumb
        var parts = formula.match(PARTS_RX);
        var thumb_rx = new RegExp('.*?/' + parts[1] + '.' + EXT_THUMB);
        var thumbs = this.thumb_matches.filter(function f(thumb) {
          return thumb.match(this. thumb_rx);
        }, {thumb_rx: thumb_rx} );
        // make one item
        return {
          name: unescape(parts[1]) + '.' + EXT_FORMULA,
          formula_url: formula, // + '?dl=1',
          thumb_url: thumbs && thumbs.length ? thumbs[0] + '?dl=1': null,
        };
      }, {thumb_matches: thumb_matches} );
      // respond
      res.send({entries: entries});
    })
  });

  req2.on('error', function(e) {
    console.log('ERROR: ' + e.message);
    res.status(502);
    res.end(JSON.stringify({success:false, error:e}));
  });
});

// This enpoinds loads a formula text file on behalf of the web
// browser (to avoid CORS denial)
app.get('/api/gallery/url/:url', async function(req, res) {
  var url = req.params.url;
  var command = 'curl -L -X GET \'' + url + '\''; 
  //console.log(command);
  exec(command, function(error, stdout, stderr) {
    if (error) {
      console.log('ERROR: ' + error);
      res.status(502);
      res.end(JSON.stringify({success:false, error:error}));
    } else {
      //console.log(stdout);
      res.send({formula: stdout});
    }
  });
});

//
// Webassembly endpoints
//

app.post('/api/compile_wasm', jsonParser, async function(req, res) {
  console.log('compile_wasm');
  let code = req.body.code;
  //console.log(code);

  execFile('./compile.py', [code], (error, stdout, stderr) => {
    console.log(`compile: stdout: ${stdout}`);
    if (stderr) {
      console.error(`compile: stderr: ${stderr}`);
    }
    if (error) {
      console.error(`compile: error: ${error.message}`);
      res.status(500);
      res.send(JSON.stringify({success:false, error, stdout, stderr}));
      return;
    }
    res.send(JSON.stringify({
      base64data: stdout.trim()
    }));
  });
  return;


  try {
    const { err, stdout, stderr } = await exec_async('./compile.py', {input:'hello'});
    console.log('<<< err:', err);
    console.log('<<< stdout:', stdout);
    console.log('<<< stderr:', stderr);
  } catch (e) {
    console.error(e);
    res.status(500);
    res.send(JSON.stringify({success:false, error:e}));
    return;
  }
  res.send(JSON.stringify({
    base64data: //'bliblablo'
    'AGFzbQEAAAABFgRgAn9/AX9gAn9/AXxgAXwAYAF8AXwCEgEDZW52Bm1lbW9yeQIBgAKAAgMFBAMCAQAHEwIFX2luaXQAAwdfcmVuZGVyAAEKowUEKQAgAEQAAAAAAADgP6CcIABEAAAAAAAA4D+hmyAARAAAAAAAAAAAZhsLogMCDH8DfEGMrOgDKAIAIgZBAEoEQEGQrOgDKAIAIQdBiKzoAygCACIEQQBKIQhBlKzoAygCACEJIABEAAAAAAAAJECjRAAAAAAAQJ9AoJyqtyEOQYCs6AMrAwAhDwNAIAcgA2siBSAFbCEKIAQgA2whCyAIBEBBACEBA0AgCSABayICIAJsIApqtyIAnyENRAAAAAAAAPA/IAIgBRACRBgtRFT7IRlAo0QAAAAAAMByQKIgAEQAAAAAAAB5QKMgDaAgDqGgmSIAIABEAAAAAAAAWUCjnEQAAAAAAABZQKKhRAAAAAAAAFlAo6EiAEQAAAAAAABJQKJEAAAAAAAA8D8gDSAPo6EiDaIQAKohAiAARAAAAAAAAPA/oCAARAAAAAAAAG5AoiANRJqZmZmZmek/okSamZmZmZnJP6CiokQAAAAAAADgP6IQAKohDCABIAtqQQJ0QYAIaiAAIAAgAEQAAAAAAABeQKKioiANohAAqkEIdCACQRB0ciAMckGAgIB4cjYCACABQQFqIgEgBEcNAAsLIANBAWoiAyAGSA0ACwsLhQEBA3wgAEEAIABrIABBf0obt0S7vdfZ33zbPaAhAiABtyEDIAFBf0oEfEQYLURU+yHpPyEEIAMgAqEgAiADoKMFRNIhM3982QJAIQQgAiADoCACIAOhowsiAiACIAJE4zYawFsgyT+ioqIgAkRgdk8eFmrvP6KhIASgIgKaIAIgAEEASBsLTABBiKzoAyAANgIAQYys6AMgATYCAEGQrOgDIAFBAXUiATYCAEGUrOgDIABBAXUiADYCAEGArOgDIAEgAWwgACAAbGq3nzkDAEGACAs='
  }));
});

//
// Static files
//

app.use(express.static('.'));

//
// Let's go
//
app.listen(3001, () => console.log(message));
