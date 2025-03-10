const express = require("express");
const https = require("https");
const app = express();
const request = require("request");
const util = require("util");
var exec = require("child_process").exec;
var execFile = require("child_process").execFile;

const exec_async = util.promisify(require("child_process").exec);

const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

////////////////////////////////////////////////////////////////////////////////
//
// logging
// https://dev.to/brightdevs/http-request-logging-in-nodejs-42od
//
const logRequestStart = (req, res, next) => {
  console.info(`${req.method} ${req.originalUrl}`);
  next();
};

app.use(logRequestStart);

////////////////////////////////////////////////////////////////////////////////
// headers

/*
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  next();
});
*/

////////////////////////////////////////////////////////////////////////////////
//
// Parameters
//

const message = "MathVue app (a Node.js backend) listening on port 3001!";
// Public page: https://www.dropbox.com/sh/18v296344ohwyiy/AADyygfek6SDwHbk6i4PS7Zya?dl=0
const GALLERY_PAGE_URL_BASE = "https://www.dropbox.com/sh/18v296344ohwyiy/";
const GALLERY_PAGE_URL =
  GALLERY_PAGE_URL_BASE + "AADyygfek6SDwHbk6i4PS7Zya?dl=0";

const EXT_THUMB = "png";
const PARTS_RX = new RegExp(".*?/([^/]+)[.]([^/]+)$");

////////////////////////////////////////////////////////////////////////////////
//
// Helpers
//

Array.prototype.unique = function () {
  return this.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
};

const END_OF_EXT = "(?=[?'])";
const FILE_NAME = "[^'\"\\:#]+[.]";
function mkUrlRegExp(ext) {
  return new RegExp(GALLERY_PAGE_URL_BASE + FILE_NAME + ext + END_OF_EXT, "g");
}

function rxMatches(text, rx) {
  var matches = text.match(rx);
  return matches ? matches.unique() : [];
}

////////////////////////////////////////////////////////////////////////////////
//
// Dropbox endpoints
//

// This endpoint fetches the formula and thumbnails of the author's
// gallery.
//
// It is implemented this way in the backend because the API does not
// work as needed for public folders.
//
const GALLERY_THUMB_RX = mkUrlRegExp(EXT_THUMB);

app.get("/api/gallery/:ext", async function (req, res) {
  let cmd = "./get_gallery.py --links --suffix=." + req.params.ext;
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.log("ERROR: " + error);
      res.status(502);
      res.end(JSON.stringify({ success: false, error, stdout, stderr }));
    } else {
      //console.log(stdout);
      res.send(stdout);
    }
  });
  return;

  /*
  var options = {
    host: 'www.dropbox.com',
    path: GALLERY_PAGE_URL,
  };

  let ext_formula = req.params.ext;
  let gallery_formula_rx = mkUrlRegExp(ext_formula);

  //console.log('ask dropbox');
  console.log("URL", options);
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
      var formula_matches = rxMatches(body, gallery_formula_rx);
      var thumb_matches = rxMatches(body, GALLERY_THUMB_RX);
      // assemble items list
      var entries = formula_matches.map(function(formula) {
        // look for corresponding thumb
        var parts = formula.match(PARTS_RX);
        var thumb_rx = new RegExp('.*?/' + parts[1] + '.' + parts[2] + '.' +EXT_THUMB);
        var thumbs = this.thumb_matches.filter(function f(thumb) {
          return thumb.match(thumb_rx);
        }, {thumb_rx: thumb_rx} );
        // make one item
        return {
          name: unescape(parts[1]) + '.' + ext_formula,
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
  */
});

app.get("/api/gallery/:ext/:like", async function (req, res) {
  let cmd =
    "./get_gallery.py --suffix=." +
    req.params.ext +
    " --startswith=" +
    req.params.like;
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.log("ERROR: " + error);
      res.status(502);
      res.end(JSON.stringify({ success: false, error, stdout, stderr }));
    } else {
      //console.log(stdout);
      res.send(stdout);
    }
  });
  return;
});

// This enpoinds loads a formula text file on behalf of the web
// browser (to avoid CORS denial)
app.get("/api/galleryurl/:url", async function (req, res) {
  var url = req.params.url;
  var command = "curl -L -X GET '" + url + "'";
  exec(command, function (error, stdout, stderr) {
    if (error) {
      console.log("ERROR: " + error);
      res.status(502);
      res.end(JSON.stringify({ success: false, error: error }));
    } else {
      //console.log(stdout);
      res.send({ formula: stdout });
    }
  });
});

////////////////////////////////////////////////////////////////////////////////
//
// Webassembly API endpoints
//

app.post("/api/compile_code", jsonParser, async function (req, res) {
  console.log("Compile_code...");
  let code = req.body.code;
  //console.log(code);

  execFile("wasm/compile.py", [code], (error, stdout, stderr) => {
    //console.log(`Compile: stdout: ${stdout}`);
    if (stderr) {
      console.error(`Compile: stderr: ${stderr}`);
    }
    if (error) {
      console.error(`Compile: error: ${error.message}`);
      stderr = (stderr || "").trim();
      /* Parse error like this:
	program.c:179:1: error: unknown type name 'xint'; did you mean 'int'?
	xint compute_pixel(double x, double y, double t) {
	^~~~
	int
	1 error generated.
	emcc: error: .....
       */
      /*
      let parts = stderr.split(':');
      let file = parts[0];
      let line = parseInt(parts[1]);
      let pos = parseInt(parts[2]);

      let i = stderr.indexOf(' ');
      let rest = stderr.slice(i+1);
      i = rest.indexOf('emcc: error:');
      let msg = rest.slice(0,i);
*/
      //res.status(500);
      res.send(
        JSON.stringify({
          success: false,
          error,
          stdout,
          stderr,
          //	compilation: {file, line, pos, msg}
        })
      );
      return;
    }
    console.log("... compile_code done.");
    res.send(
      JSON.stringify({
        success: true,
        base64data: stdout.trim(),
      })
    );
  });
});

////////////////////////////////////////////////////////////////////////////////
//
// Static files
//

app.get("/pjs", function (req, res) {
  res.sendfile("pjs/index.html");
});

app.get("/webassembly", function (req, res) {
  res.sendfile("wasm/index.html");
});
app.get("/wasm", function (req, res) {
  res.sendfile("wasm/index.html");
});
app.get("/", function (req, res) {
  res.sendfile("wasm/index.html");
});

app.use(express.static("."));

////////////////////////////////////////////////////////////////////////////////
//
// Let's go
//
app.listen(3001, () => console.log(message));
