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
    isChrome: browserDetect().name == "chrome",
    base64data: null, // Contains the actual webassembly
    noAnimation: false,
    capturer: null,
    captureDuration: 15,  // between 10s and 20s for Instagram
    captureFramesToGo:0,
    captureFrameRate: 60,
    compiled: false,
    countdown: 0,
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
    wCtx: null,
    wRenderF: null,
    wInitializeF: null,
    wImg: null,
  },

  methods: {
    countDown: function() {
      if (this.formula.trim() && this.countdown>0) {
	if (this.countdown == 1)
	  this.run();
	if (this.countdown>0) {
	  this.countdown--;
	  setTimeout(() => { this.countDown();}, 1000)
	}
      }
    },

    abortCountdown: function() {
      this.countdown = 0;
    },

    sleep: function(delay) {
      async function wait() {
	await new Promise(resolve => setTimeout(resolve, delay));
      }
      wait();
    },

    //
    // Emcc compilation methods
    //

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
	this.setCompilationStatus();
	this.startWasm();
      }
      else {
	this.isLoading = false;
	this.setCompilationStatus(response.data.stderr);
      }
    },

    setCompilationStatus: function(message) {
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

    run: function() {
      this.compiled = false;
      this.countdown = 0;
      this.isStarted = false;
      this.mustPauseAfterRun = false;
      this.stopCapture();
      this.compileCode();
    },

    runOneFrame: function() {
      this.mustPauseAfterRun = true;
      this.compileCode();
    },

    pause: function() {
      this.isRunning = false;
    },

    resume: function() {
      this.isRunning = true;
      this.render();
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
      this.wCtx = canvas.getContext(
	'2d', {alpha: false, antialias: false, depth: false}
      );
      if (!this.wCtx) {
	throw 'Your browser does not support canvas';
      }
      let height = canvas.height;
      let width = canvas.width;

      // Bind WASM to canvas
      // -------------------
      this.errorText += '\nBinding WASM to canvas...';
      const instance = await WebAssembly.instantiate(module, importObject);
      const wasmInitF = instance.exports._init || instance.exports.init;
      this.wRenderF = instance.exports._render || instance.exports.render;
      this.wInitializeF = instance.exports._initialize || instance.exports.initialize;
      //console.warn('exports:', instance.exports)
      const formula_width = instance.exports.get_width();
      const formula_height = instance.exports.get_height();
      const formula_no_animation = instance.exports.get_no_animation();
      this.noAnimation = formula_no_animation;

      console.log('Formula-defined size:', formula_width, formula_height);
      canvas.width = width = formula_width;
      canvas.height = height = formula_height;

      const pointer = wasmInitF();
      const data = new Uint8ClampedArray(memory.buffer, pointer,
					 width * height * 4);
      this.wImg = new ImageData(data, width, height);
      this.errorText += ' OK';

      // Render
      // ------
      this.isLoading = false;
      this.isRunning = true;
      this.compiled = true;
      this.errorText += '\nFiring up animation.';
      this.render();
    },

    render: function(timestamp) {
      if (!this.isRunning) return;
      this.updateFps();

      if (!timestamp && this.capturer) {
	//console.log('>> initialize_f');
	this.wInitializeF();
      }
      if (this.capturer)
	timestamp =  Date.now();

      //console.log('>> render', timestamp);
      window.requestAnimationFrame(this.render);
      if(!timestamp) return;

      //console.log('>> render_f');
      this.wRenderF(timestamp);
      this.wCtx.putImageData(this.wImg, 0, 0);

      if (this.noAnimation)
	this.pause();
      else
	this.afterRender();
    },

    afterRender: function() {
      this.isStarted = true;

      if (this.mustPauseAfterRun) {
	this.mustPauseAfterRun = false;
	this.isRunning = false;
	return;
      }

      if (this.capturer) {
	//console.log('>> capture');
	this.capturer.capture(canvas);
	if (this.captureFramesToGo > 0)
	  this.captureFramesToGo--;
	else {
	  //console.log('>> stop capture');
	  this.stopCapture();
	  this.isRunning = false;
	  return;
	}
      }
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
	  framerate: this.captureFrameRate,
	  quality: 99,
	  format: 'webm',
	  frameLimit: 0,
	  autoSaveTime: 0
	})
	this.captureFramesToGo = this.captureFrameRate * this.captureDuration -1;
	this.isRunning = true;
	//console.log('>> start capture');
	this.capturer.start();
	this.render();
      }
    },

    stopCapture: function() {
      if (this.capturer) {
	this.capturer.stop();
	try {
	  this.capturer.save();
	}
	catch (e) {
	}
	// TODO: remove capturer status display
	this.capturer = null;
      }
    },

    // Misc
    refocus: function() {
      let el = $('#formulaEditor > textarea');
      el.focus();
    }

  },

  created() {
    this.dropboxManager = DropboxManager(this.onDropboxLoginState,
					 this.getFormula, this.setFormula,
					 this.grabImage, ENDING,
					 this.$route.hash);
  },

  mounted() {
    console.log('Mounted:', this.$route.query);
    let args = this.$route.query;
    this.refocus();

    // valueless args are taken as samples
    let samples = Object.keys(args).filter((k) => args[k] === null)
    let sample = samples.length ? samples[samples.length-1] : null;
    if (sample){
      this.dropboxManager.dropboxLoadSampleLike(sample, () => {
	router.replace({});
	this.run();
      });
    }
    // normal start
    else {
      this.countdown = 4;
      this.formula = browserFormulaStorage.defaultFormula;
      this.countDown();
    }
  }
});

// refocus editor
$('body').on("click dblclick mousedown mouseup show",
	     function(e) {
	       console.log('>', e.type, e.target.localName, e);
	       let disabled = e.target.attributes.getNamedItem('disabled');
	       if (!disabled) {
		 if (e.target.localName == 'textarea') return;
		 if (e.target.localName == 'input') return;
	       }
	       app.refocus();
	     });
