# MathVue

## About
Re-implementation of [MathVision](https://github.com/pbauermeister/MathVision) with these technologies:
- [Vue](https://vuejs.org/)
- [Bootstrap](https://getbootstrap.com/)
- [Processing.js](http://processingjs.org/)
- [asm.js](http://asmjs.org/) (planned)

There is no backend. Sharing formulas will be done using APIs of cloud file hosting services (e.g. Dropbox).

## To try it
1. Visit https://mathvue.com/
2. Click the Play button to play the boring default formula.

You can also try this formula:
```
#include <complex.h>
const int K        = 4;  // set to 1 for full size when recording

const double RATIO = 16. / 9.;
const int WIDTH    = 1080/K;  // 1920 would cause mem error
const int HEIGHT   = (int)(1080/RATIO/K) & 0xfffe;
const double X_MIN = -4 * RATIO;
const double X_MAX =  4 * RATIO;
const double Y_MIN = -4;
const double Y_MAX =  4;
const int FPS      = 60;

double t0 = 0;
void initialize() { t0 = 0; }

bool pre_draw(double t) {
    if (t0 == 0) t0 = t;
    return true;
}

int compute_pixel(double x, double y, double t) {
    double complex z  = x - y * I;

    double tt = cos((t - t0) * TWO_PI / FPS);
    double complex z1 = z + 4*tt;
    double complex z2 = 1 / (z - 4*tt);
    return make_hsv_complex(z1 + z2);
}
```
