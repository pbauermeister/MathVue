# MathVue

## About
Re-implementation of [MathVision](https://github.com/pbauermeister/MathVision) with these technologies:
- [Vue](https://vuejs.org/)
- [Bootstrap](https://getbootstrap.com/)
- [Processing.js](http://processingjs.org/)
- [asm.js](http://asmjs.org/) (planned)

There is no backend. Sharing formulas will be done using APIs of cloud file hosting services (e.g. Dropbox).

## To try it
1. Visit https://rawgit.com/pbauermeister/MathVue/master/index.html
2. Click the Play button to play the default formula.

You can also try this formula:
```
WIDTH = 600; RATIO = 2;
X_MIN =  -1; X_MAX = 1;
Y_MIN = 0.5; Y_MAX = -0.5;
TIME_INCREMENT = 0.5;
OUT_PAUSE = false;
float cosT, sinT;

bool preDraw(float t0) {
    float t = sin(t0/320) * TWO_PI * 4 + sin(t0/20) * PI / 2 - cos(t0/40) * PI;
    cosT = cos(t/10);
    sinT = sin(t/10);
    return true;
}

color hsb(float x0, float y0, float t) {
    float x = x0 * cosT - y0 * sinT;
    float y = y0 * cosT + x0 * sinT; 
    if(y==0) return color(0); // avoid zero-divide

    ay = abs(y);
    float x1 = x;
    float y1 = ay;

    float val = cos(1/y1+t) * cos(x1/y1);             // perspective spots raster
    val = 1 - pow(val, 4);                            // increase contrast
    float fade = y1/Y_SPAN*2;
    val *= fade;                                      // fade horizon to avoid moiree
    float color_shift = cos(t/10)/2;

    // pack all into HSV
    float z = 1+sin(val/2); // 0..2
    float h = (z + color_shift) * 85;
    h = min(max(h, 0), 255);
    float v = y<0 ? 250 : 128*z;
    return color(h, 200, v);
}
```

## Tips & Tricks
- Full-screen canvas: https://h3manth.com/content/html5-canvas-full-screen-and-full-page
