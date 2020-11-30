/*
 * Vue.js app.
 */

var router = new VueRouter({
  mode: 'history',
  routes: []
});

var app = new Vue({
  router,
  el: '#app',

  data: {
    programNr: 0,
    running: false,
    loading: false,
    base64data: null, // Contains the actual webassembly
    error: false,
    errorText: null,
    fpsFrameNr: 0,
    fpsStartTime: null,
    fps: null,
    formula: `
int WIDTH = 505;
int HEIGHT = 303;

void initialize() {}

double cos_t;
double sin_t;
bool pre_draw(double t0) {
    float t = sin(t0/320) * TWO_PI * 4 + sin(t0/20) * PI / 2 - cos(t0/40) * PI;
    cos_t = cos(t/10);
    sin_t = sin(t/10);
    return true;
}

int compute_pixel(double x, double y, double t) {
    double x1 = x * cos_t - y * sin_t;
    double y1 = y * cos_t + x * sin_t;
    if(y1==0) return -1; // avoid zero-divide

    double x2 = x1;
    double y2 = fabs(y1);

    double val = cos(1/y2 + t) * cos(x2/y2);   // perspective spots raster
    val = 1 - pow(val, 4);                     // increase contrast
    double fade = y2/Y_SPAN*2;
    val *= fade;                               // fade horizon to avoid moiree
    double color_shift = cos(t/10)/2;

    // pack all into HSV
    double z = 1 + sin(val/2); // 0..2
    double h = (z + color_shift) * 120; // 0..360
    double v = y1<0 ? 100 : 50*z;
    return convert_hsv_to_rgb(h, 78, v);
}`.trim(),
    formula: `
#include "noise/open-simplex-noise.c"

const int K = 1;
int WIDTH  = 500 *K;
int HEIGHT = 294 *K;

struct osn_context *ctx;
void initialize() {
  open_simplex_noise(77374, &ctx);
}

bool pre_draw(double t0) { return true; }

const double steps = 6;

double val(double x, double y, double t) {
  double f0 = open_simplex_noise3(ctx, x / 2 - t/2, y / 2 - t/2, t/2);
  double f1 = open_simplex_noise3(ctx, x * 3 + t, y * 3 + t, t);

  double value = fabs(f0 + f1) / 2;

  return floor(value * steps) / steps;
}

int compute_pixel(double x, double y, double t) {
  double v = val(x*3, y*3, t/7/K/K/K);
  double h = (1.5-v) * 180;
  h = fmod(h, 360);

  return convert_hsv_to_rgb(h, 78, v * 200);
}
`.trim()
  },

  methods: {
    changeEditorContent: function(val) {
      if (this.formula !== val) {
        this.formula = val
      }
    },

    setCompileStatus: function(message) {
      if (message) {
	console.warn(`Compilation error:\n${message}`);
	this.errorText = message;
	this.error = true;
      }
      else {
	this.errorText = "OK";
	this.error = false;
      }
    },

    //
    // Animation methods
    //

    run: function() {
      this.compileCode();
    },

    compileCode: function() {
      this.pause();
      this.loading = true;
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
	  this.loading = false;
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
	this.loading = false;
	this.setCompileStatus(response.data.stderr);
      }
    },

    pause: function() {
      this.running = false;
    },

    resume: function() {
      this.running = true;
    },

    playToggle: function() {
      this.running = !this.running;
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

    onInput: function() {
//      this.link = makeLink(false, this.formula);
//      this.linkToGithub = makeLink(true, this.formula);
//      pjs_formula.save(this.formula);
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
	this.errorText = '' + error;
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
      const instance = await WebAssembly.instantiate(module, importObject);
      const init_f = instance.exports._init || instance.exports.init;
      const render_f = instance.exports._render || instance.exports.render;
      //console.warn('exports:', instance.exports)
      const formula_width = instance.exports.get_width();
      const formula_height = instance.exports.get_height();
      console.log('Formula-defined size:', formula_width, formula_height);
      if (formula_width && formula_height) {
	canvas.width = width = formula_width;
	canvas.height = height = formula_height;
      }

      const pointer = init_f(width, height);
      const data = new Uint8ClampedArray(memory.buffer, pointer,
					 width * height * 4);
      const img = new ImageData(data, width, height);

      // Render
      // ------
      this.programNr++;
      this.loading = false;
      this.running = true;
      let programNr = this.programNr;
      const render = (timestamp) => {
	if (this.programNr != programNr)
	  return;
	this.updateFps();
	if (this.running) {
	  render_f(timestamp);
	  ctx.putImageData(img, 0, 0);
	}
	window.requestAnimationFrame(render);
      };
      window.requestAnimationFrame(render);
    }
  },

  mounted() {
    this.run();
  }
});
