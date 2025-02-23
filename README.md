# MathVue

## Summary

Make animated art by means of math and C code in your web browser.

This project implements a backend providing a web page, in which a formula can be developed (in C),
then compiled by the backend as Webassembly, and returned to the browser for real-time rendering.

## About
Re-implementation of [MathVision](https://github.com/pbauermeister/MathVision) with these technologies:
- [Vue](https://vuejs.org/)
- [Bootstrap](https://getbootstrap.com/)
- [Processing.js](http://processingjs.org/)
- [asm.js](http://asmjs.org/) (planned)

Sharing formulas will be done using Dropbox.

## To try it
1. Visit https://mathvue.com/
2. Click the Play button to play the boring default formula.

## Example formula
Paste this formula into the MathVue formula box:
```
#include <complex.h>
const int K        = 3;  // set to 1 for full size when recording

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

    // these are the 3 significant lines of code:
    double tt = cos((t - t0) * TWO_PI / FPS);
    double complex z1 = z + 4*tt;
    double complex z2 = 1 / (z - 4*tt);

    return make_hsv_complex(z1 + z2);
}
```
The canvas will display:  
![simple example](https://raw.githubusercontent.com/pbauermeister/MathVue/master/example.gif "Simple example")

You can record a video in WEBM format (better quality than in the above GIF).
