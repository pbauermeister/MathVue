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
    program_nr: 0,
    running: false,
    loading: false,
    base64data: null, // Contains the actual webassembly
    formula: `
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
}`.trim()
  },

  methods: {
    //
    // Animation methods
    //

    run: function() {
      this.compile_code();
    },

    compile_code: function() {
      this.loading = true;
      axios.post('/api/compile_code', {code: this.formula})
	.then((response) => {
	  console.log(response);
          this.base64data = response.data.base64data;
	  try {
	    this.start_wasm();
	  }
	  catch (e) {
	    console.error(e);
	  }
	})
	.catch((error) => {
	  console.error(error);
	  console.error(error.response || error);
	  console.error(error.response.data.error);
	  console.error(error.response.data.stderr);
          //onError(error);
	});
    },

    pause: function() {
      this.running = false;
    },

    resume: function() {
      this.running = true;
    },

    play_toggle: function() {
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

    decode_b64: function(b64) {
      const str = window.atob(b64);
      const array = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i += 1) {
	array[i] = str.charCodeAt(i);
      }
      return array.buffer;
    },

    start_wasm: function() {
      this.start_wasm_async();
    },

    start_wasm_async: async function() {
      this.factor = -(this.factor||1);

      const binary_code = this.decode_b64(this.base64data);
      console.log('*** start_wasm');
      console.log('Code length (b64):', this.base64data.length);

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
	  })
	},
	imports: {
	  imported_func: function(arg) {
	    console.log(arg);
	  },
	}
      };

      const buffer = new Uint8Array(binary_code);

      const module = await WebAssembly.compile(buffer);
      var imports = WebAssembly.Module.imports(module);
      console.log({imports});
      var exports = WebAssembly.Module.exports(module);
      console.log({exports});

      const instance = await WebAssembly.instantiate(module, importObject);

      // Get canvas
      // ----------
      const canvas = document.getElementById('canvas');
      const height = canvas.height;
      const width = canvas.width;
      const ctx = canvas.getContext(
	'2d', {alpha: false, antialias: false, depth: false}
      );
      if (!ctx) {
	throw 'Your browser does not support canvas';
      }

      // Bind WASM to canvas
      // -------------------
      const init_f = instance.exports._init || instance.exports.init;
      const render_f = instance.exports._render || instance.exports.render;

      const pointer = init_f(width, height, this.factor);
      const data = new Uint8ClampedArray(memory.buffer, pointer,
					 width * height * 4);
      const img = new ImageData(data, width, height);

      // Render
      // ------
      this.program_nr++;
      this.loading = false;
      this.running = true;
      let program_nr = this.program_nr;
      const render = (timestamp) => {
	if (this.program_nr != program_nr)
	  return;
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
    //this.compile_code();
    //this.start_wasm();
    this.run();
  }
});
