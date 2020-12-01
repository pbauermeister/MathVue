/*
 * Vue.js app.
 */

const ENDING = 'c';

var router = new VueRouter({
  mode: 'history',
  routes: []
});

var browserFormulaStorage = new BrowserFormulaStorage(ENDING, DEFAULT_FORMULA);

var app = new Vue({
  router,
  el: '#app',

  data: {
    base64data: null, // Contains the actual webassembly
    capturer: null,
    captureDuration: 15,  // between 10s and 20s for Instagram
    captureFramesToGo:0,
    dropboxManager: null,
    error: false,
    errorText: null,
    formula: '',
    fps: null,
    fpsFrameNr: 0,
    fpsStartTime: null,
    isLoading: false,
    isRunning: false,
    isStarted: false,
    mustPauseAfterRun: false,
    programNr: 0,
  },

  methods: {
    setCompileStatus: function(message) {
      if (message) {
	console.warn(`Compilation error:\n${message}`);
	this.errorText = message;
	this.error = true;
      }
      else {
	this.errorText += ' OK';
	this.error = false;
      }
    },

    //
    // Animation methods
    //

    runOneFrame: function() {
      this.mustPauseAfterRun = true;
      this.compileCode();
    },

    run: function() {
      this.mustPauseAfterRun = false;
      this.isStarted = false;
      this.compileCode();
    },

    compileCode: function() {
      this.errorText = 'Starting emscripten compilation...';
      this.error = false;
      this.isLoading = true;
      this.pause();
      axios.post('/api/compile_code', {code: this.formula})
	.then((response) => {
	  console.log('compileCode():', response);
	  try {
	    this.handleCompilationResponse(response);
	  }
	  catch (e) {
	    console.error(e);
	  }
	})
	.catch((error) => {
	  this.isLoading = false;
	  this.$refs.status_dialog.showError(error);
	});
    },

    handleCompilationResponse: function(response) {
      if (response.data.success) {
        this.base64data = response.data.base64data;
	this.setCompileStatus();
	this.startWasm();
      }
      else {
	this.isLoading = false;
	this.setCompileStatus(response.data.stderr);
      }
    },

    pause: function() {
      this.isRunning = false;
    },

    resume: function() {
      this.isRunning = true;
    },

    playToggle: function() {
      this.isRunning = !this.isRunning;
    },

    fullScreen: function(event) {
      // full screen
      var el = document.getElementById('canvas');
      if(el.webkitRequestFullScreen) {
        el.webkitRequestFullScreen();
      } else {
        el.mozRequestFullScreen();
      }
    },

    //
    // Formula methods
    //

    changeEditorContent: function(val) {
      if (this.formula !== val) {
        this.formula = val;
	browserFormulaStorage.save(this.formula);
      }
    },

    //
    // Wasm methods
    //

    decodeB64: function(b64) {
      const str = window.atob(b64);
      const array = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i += 1) {
	array[i] = str.charCodeAt(i);
      }
      return array.buffer;
    },

    startWasm: function() {
      try {
	this.startWasmAsync();
      }
      catch(error) {
	console.error(error);
	this.errorText = '\n' + error;
	this.error = true;
      }
    },

    updateFps: function() {
      if (!this.fpsFrameNr) {
	this.fpsStartTime = Date.now();
	++this.fpsFrameNr;
      }
      else if (this.fpsFrameNr < 50) {
	++this.fpsFrameNr;
      }
      else {
	let delta = (Date.now() - this.fpsStartTime) / 1000;
	this.fps = Math.round(this.fpsFrameNr / delta);
	this.fpsFrameNr = 0;
      }
    },

    startWasmAsync: async function() {
      this.errorText += '\nStarting WASM compilation...';
      const binary_code = this.decodeB64(this.base64data);
      console.log('*** start wasm: B64 code length:', this.base64data.length);

      // Compile WASM
      // ------------
      // https://compile.fi/canvas-filled-three-ways-js-webassembly-and-webgl/
      const memSize = 256;
      const memory = new WebAssembly.Memory({
	initial: memSize,
	maximum: memSize
      });
      const importObject = {
	env: {
	  memoryBase: 0,
	  memory: memory,
	  tableBase: 0,
	  table: new WebAssembly.Table({
	    initial: 0,
	    element: 'anyfunc'
	  }),
	  emscripten_resize_heap: function(size) {
            return false; // always fail
          }
	},
	imports: {
	  imported_func: function(arg) {
	    console.log('*** imported_func', arg);
	  },
	}
      };

      const buffer = new Uint8Array(binary_code);

      const module = await WebAssembly.compile(buffer);
      var imports = WebAssembly.Module.imports(module);
      //console.log('imports:', {imports});
      var exports = WebAssembly.Module.exports(module);
      //console.log('exports:', {exports});
      this.errorText += ' OK';

      // Get canvas
      // ----------
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext(
	'2d', {alpha: false, antialias: false, depth: false}
      );
      if (!ctx) {
	throw 'Your browser does not support canvas';
      }
      let height = canvas.height;
      let width = canvas.width;

      // Bind WASM to canvas
      // -------------------
      this.errorText += '\nBinding WASM to canvas...';
      const instance = await WebAssembly.instantiate(module, importObject);
      const init_f = instance.exports._init || instance.exports.init;
      const render_f = instance.exports._render || instance.exports.render;
      //console.warn('exports:', instance.exports)
      const formula_width = instance.exports.get_width();
      const formula_height = instance.exports.get_height();

      console.log('Formula-defined size:', formula_width, formula_height);
      canvas.width = width = formula_width;
      canvas.height = height = formula_height;

      const pointer = init_f();
      const data = new Uint8ClampedArray(memory.buffer, pointer,
					 width * height * 4);
      const img = new ImageData(data, width, height);
      this.errorText += ' OK';

      // Render
      // ------
      this.programNr++;
      this.isLoading = false;
      this.isRunning = true;
      let programNr = this.programNr;
      const render = (timestamp) => {
	if (this.programNr != programNr)
	  return;
	this.updateFps();
	if (this.isRunning) {
	  render_f(timestamp);
	  ctx.putImageData(img, 0, 0);
	  this.isStarted = true;

	  if (this.mustPauseAfterRun) {
	    this.mustPauseAfterRun = false;
	    this.isRunning = false;
	    return;
	  }

	  if (this.capturer) {
	    this.capturer.capture(canvas);
	    if (this.captureFramesToGo >= 0)
	      this.captureFramesToGo--;
	    else {
	      this.capturer.stop();
	      this.capturer.save();
	      this.capturer = null;
	    }
	  }
	}
	window.requestAnimationFrame(render);
      };
      this.errorText += '\nFiring up animation.';
      window.requestAnimationFrame(render);
    },

    //
    // Interface to Dropbox
    //
    getFormula: function() {
      return this.formula;
    },

    setFormula: function(formula) {
      this.formula = formula;
      this.runOneFrame();
      browserFormulaStorage.save(this.formula);
    },

    grabImage: function() {
      if (!this.isStarted) {
        this.runOneFrame();

	async function wait() {
	  while (!this.isStarted) {
	    await new Promise(resolve => setTimeout(resolve, 100));
	  }
	}
	wait();
      }

      var name = "canvas";
      var canvas = document.getElementById(name);
      var image = canvas.toDataURL('image/png');
      var b64Data = image.replace(/^data:image\/(png|jpg);base64,/, '');
      return b64Data;
    },

    onDropboxLoginState: function(dropboxManager) {
      this.$emit('dropbox-login-state', dropboxManager);
    },

    //
    // Recording
    //

    toggleRecording: function() {
      if (this.capturer) {
	this.captureFramesToGo = 0;
	// let render() finish, stop and save.
      } else {
	this.capturer = new CCapture({
	  verbose: false,
	  display: true,
	  framerate: 60,
	  quality: 99,
	  format: 'webm',
	  frameLimit: 0,
	  autoSaveTime: 0,
	  onProgress: function(p) {console.log('>', p)}
	})
	this.captureFramesToGo = 60 * this.captureDuration;
	this.capturer.start();
      }
    }
  },

  created() {
    // init Dropbox
    if (!window.location.href.startsWith('file:')) {
      this.dropboxManager = DropboxManager(this.onDropboxLoginState,
					   this.getFormula, this.setFormula,
					   this.grabImage, ENDING,
					   this.$route.hash);
    }
  },

  mounted() {
    this.formula = browserFormulaStorage.defaultFormula;
    this.run();
  }
});
