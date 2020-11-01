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
    // Contains the actual webassembly
    base64data: 'AGFzbQEAAAABFgRgAn9/AX9gAn9/AXxgAXwAYAF8AXwCEgEDZW52Bm1lbW9yeQIBgAKAAgMFBAMCAQAHEwIFX2luaXQAAwdfcmVuZGVyAAEKowUEKQAgAEQAAAAAAADgP6CcIABEAAAAAAAA4D+hmyAARAAAAAAAAAAAZhsLogMCDH8DfEGMrOgDKAIAIgZBAEoEQEGQrOgDKAIAIQdBiKzoAygCACIEQQBKIQhBlKzoAygCACEJIABEAAAAAAAAJECjRAAAAAAAQJ9AoJyqtyEOQYCs6AMrAwAhDwNAIAcgA2siBSAFbCEKIAQgA2whCyAIBEBBACEBA0AgCSABayICIAJsIApqtyIAnyENRAAAAAAAAPA/IAIgBRACRBgtRFT7IRlAo0QAAAAAAMByQKIgAEQAAAAAAAB5QKMgDaAgDqGgmSIAIABEAAAAAAAAWUCjnEQAAAAAAABZQKKhRAAAAAAAAFlAo6EiAEQAAAAAAABJQKJEAAAAAAAA8D8gDSAPo6EiDaIQAKohAiAARAAAAAAAAPA/oCAARAAAAAAAAG5AoiANRJqZmZmZmek/okSamZmZmZnJP6CiokQAAAAAAADgP6IQAKohDCABIAtqQQJ0QYAIaiAAIAAgAEQAAAAAAABeQKKioiANohAAqkEIdCACQRB0ciAMckGAgIB4cjYCACABQQFqIgEgBEcNAAsLIANBAWoiAyAGSA0ACwsLhQEBA3wgAEEAIABrIABBf0obt0S7vdfZ33zbPaAhAiABtyEDIAFBf0oEfEQYLURU+yHpPyEEIAMgAqEgAiADoKMFRNIhM3982QJAIQQgAiADoCACIAOhowsiAiACIAJE4zYawFsgyT+ioqIgAkRgdk8eFmrvP6KhIASgIgKaIAIgAEEASBsLTABBiKzoAyAANgIAQYys6AMgATYCAEGQrOgDIAFBAXUiATYCAEGUrOgDIABBAXUiADYCAEGArOgDIAEgAWwgACAAbGq3nzkDAEGACAs=',
    code: `
#include <math.h>
#include <stdlib.h>
#include <emscripten.h>
#include <stdio.h>

int height;
int width;
int pixelCount;
int factor;

/*
We'll cheat a bit and just allocate loads of memory
so we don't have to implement malloc
*/
int data[2000000];

int* EMSCRIPTEN_KEEPALIVE init(int cWidth, int cHeight, int cFactor) {
  factor = cFactor;
  width = cWidth;
  height = cHeight;
  pixelCount = width * height;
  // data = malloc(pixelCount * sizeof(int));
  return &data[0];
}

void EMSCRIPTEN_KEEPALIVE render(double timestamp) {
  for (int y = 0; y < height; y++) {
    int yw = y * width;
    for (int x = 0; x < width; x++) {
      int xx = factor > 0 ? x + (int)timestamp : (int)timestamp - x;
      data[yw + x] =
        (255 << 24)      |   // A
        ((xx%256) << 16) |   // B
        ((y%256) <<  8)  |   // G
        (xx+y)%256;          // R
    }
  }
}

`,
    code: `
#include <math.h>
#include <stdlib.h>
#include <emscripten.h>

int height;
int width;
int pixelCount;

#define PI 3.14159265358979323846
#define TWO_PI (PI*2)

#define min(a, b)  ((a) > (b) ? (b) : (a))
#define max(a, b)  ((a) > (b) ? (a) : (b))

#define COEFF_1 0.7853981633974483
#define COEFF_2 2.356194490192345
double customAtan2(float y, float x) {
  double abs_y = fabs(y) + 1e-10;
  double angle;
  if (x >= 0) {
    double r = (x - abs_y) / (x + abs_y);
    angle = 0.1963 * r * r * r - 0.9817 * r + COEFF_1;
  } else {
    double r = (x + abs_y) / (abs_y - x);
    angle = 0.1963 * r * r * r - 0.9817 * r + COEFF_2;
  }
  return y < 0 ? -angle : angle;
}

/*
We'll cheat a bit and just allocate loads of memory
so we don't have to implement malloc
*/
int data[2000000];

int* EMSCRIPTEN_KEEPALIVE init(int cWidth, int cHeight, int cFactor) {
  width = cWidth;
  height = cHeight;
  pixelCount = width * height;
  // data = malloc(pixelCount * sizeof(int));
  return &data[0];
}

//WIDTH = 600; RATIO = 2;
const double X_MIN =   -1;
const double X_MAX =    1;
const double Y_MIN =  0.5;
const double Y_MAX = -0.5;

const double X_SPAN = X_MAX - X_MIN;
const double Y_SPAN = Y_MAX - Y_MIN;
//TIME_INCREMENT = 0.5;


int convert_hsv_to_rgb(float H, float S, float V) {
  if(H>360 || H<0 || S>100 || S<0 || V>100 || V<0){
    return 0;
  }
  float s = S/100;
  float v = V/100;
  float C = s*v;
  float X = C*(1-fabs(fmod(H/60.0, 2)-1));
  float m = v-C;
  float r,g,b;
  if(H >= 0 && H < 60){
    r = C, g = X, b = 0;
  }
  else if(H >= 60 && H < 120){
    r = X, g = C, b = 0;
  }
  else if(H >= 120 && H < 180){
    r = 0, g = C, b = X;
  }
  else if(H >= 180 && H < 240){
    r = 0, g = X, b = C;
  }
  else if(H >= 240 && H < 300){
    r = X, g = 0, b = C;
  }
  else{
    r = C, g = 0, b = X;
  }
  int R = (r+m)*255;
  int G = (g+m)*255;
  int B = (b+m)*255;

  return (B   << 16)  |  // B
         (G   <<  8)  |  // G
         (R        );    // R
}

void EMSCRIPTEN_KEEPALIVE render(double timestamp) {
  double w = (double)width;
  double h = (double)height;
  double t = timestamp;

  for (int v = 0; v < height; v++) {
    int vv = v * width;
    double y = Y_SPAN * (double)v / h + Y_MIN;
    for (int u = 0; u < width; u++) {
      double x = X_SPAN * (double)u / w + X_MIN;

      float radius = sqrt(x*x + y*y);  // cartesian to polar
      float angle = customAtan2(x, y) - t/8;   // cartesian to polar; turns with time

      // the spiral
      float value = angle*3 - log(radius)*12;
      value = cos(value);

      int luma = (int)((value + 1) * 127);
      int pixel = luma | luma <<8 | luma << 16;

      data[vv + u] = (255 << 24) | pixel;
    }
  }
}
`
  },

  methods: {
    compile_wasm: function() {
      let code = this.code;
      axios.post('/api/compile_wasm', {code: code})
	.then((response) => {
	  console.log(response);
          this.base64data = response.data.base64data;
	  try {
	    this.clone_canvas();
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

    clone_canvas: function() {
      return;
      const canvas = document.getElementById('canvas');
      let clonedItem = canvas.cloneNode(false);
      canvas.parentNode.appendChild(clonedItem);
      canvas.remove();
    },

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

      //
      // Compile WASM
      // https://compile.fi/canvas-filled-three-ways-js-webassembly-and-webgl/
      //
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

      //
      // Get canvas
      //
      const canvas = document.getElementById('canvas');
      const height = canvas.height;
      const width = canvas.width;
      const ctx = canvas.getContext(
	'2d', {alpha: false, antialias: false, depth: false}
      );
      if (!ctx) {
	throw 'Your browser does not support canvas';
      }

      //
      // Bind WASM to canvas
      //
      const init_f = instance.exports._init || instance.exports.init;
      const render_f = instance.exports._render || instance.exports.render;

      const pointer = init_f(width, height, this.factor);
      const data = new Uint8ClampedArray(memory.buffer, pointer,
					 width * height * 4);
      const img = new ImageData(data, width, height);

      //
      // Render
      //
      this.program_nr++;
      let program_nr = this.program_nr;
      const render = (timestamp) => {
	if (this.program_nr != program_nr)
	  return;
	render_f(timestamp);
	ctx.putImageData(img, 0, 0);
	window.requestAnimationFrame(render);
      };
      window.requestAnimationFrame(render);
    }
  },

  mounted() {
    //this.compile_wasm();
    this.start_wasm();
  }
});
