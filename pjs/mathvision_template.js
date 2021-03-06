/*
 * MathVision PDE template
 */

var mathVisionTemplate = `
/*****************************************************************************
 PDE template for the MathVision (or MathVue) project.

 When the user formula below is replaced by the desired MathVision formula,
 this forms a valid PDE script that can be run by Processing.

 Credits:
 - MathVue (C) by Pascal Bauermeister.
 - Processing for Javascript, see http://processingjs.org/
 - User formula aka sketch (C) by its author.

 MathVue is inspired by and dedicated to the Amiga MathVISION
 software, see http://home.olympus.net/~7seas/
 ****************************************************************************/
/////////////////// Defaults
color def_rgb(x, y) {
    int r = ((x*255*4)/X_SPAN) % 256;
    int g = ((y*255*4)/Y_SPAN) % 256;
    int b = 256*(y*X_SPAN+x)/(X_SPAN*Y_SPAN);
    int b = ((y*255)/Y_SPAN) % 256;
    return color(r, g, b, 64);
}
int AUTO = -1; // constant
int WIDTH = 300;
float RATIO = 4/3;
int HEIGHT = 0;
int FRAMES = 0;
float X_MIN = 0;
float X_MAX = 1;
float Y_MIN = 0;
float Y_MAX = 1/RATIO;
bool preDraw(t) { return true; }
void postDraw(t) { }
void preSetup() { }
float TIME_INCREMENT = 0;
float FIRST_FRAME_TIME = 0;
bool CLICK_PAUSE = false;
bool OUT_PAUSE = true;
bool MOUSE_MOVE = false;
/////////////////// These markers will be needed for formula
/////////////////// replacement. Do not alter them:
/////////////////// Start of user formula @@@
WIDTH=300;
HEIGHT=200;
color RGB(x, y) {
    return color(cos(x/y)*127+128);
}
/////////////////// End of user formula @@@
int u;
int v;
float t = 0;
int i = 0;
int t_on = true;
int X_SPAN;
int Y_SPAN;
var FN;
int argsOf(fn) {
    try {
	return eval(fn).length;
    }
    catch(err) {
	return 0;
    }
}
void setup() {
    try {
	js_mathvision_init_table_fe10b9138ae11aa9ee53144515b4777e369e3d8d(FRAMES);
    }
    catch(err) {}
    X_SPAN = X_MAX - X_MIN;
    Y_SPAN = Y_MAX - Y_MIN;
    if(RATIO==AUTO) {
	RATIO = X_SPAN / Y_SPAN;
    }
    if(HEIGHT==0) {
	HEIGHT = (int)(WIDTH/RATIO + 0.5);
    }
    v = 0;
    size((int)WIDTH, (int)HEIGHT);
    noStroke();
    background(255);
    loop();
    // for first frame, simulate centered mouse
    mouseX = WIDTH/2;
    mouseY = HEIGHT/2;
    // determine mode: rgb(x,y) or rgb(x,y,t) or hsb(x,y) or hsb(x,y,t)
    var nArgs;
    if((nArgs = argsOf("hsb"))>0) {
	colorMode(HSB, 255);
	FN = hsb;
    }
    else {
	nArgs = argsOf("rgb");
	colorMode(RGB, 255);
        try {
	    FN = rgb;
	}
	catch(err) {
	    //font = loadFont("FFScala.ttf"); 
	    //textFont(font); 
	    drawFrame(FIRST_FRAME_TIME, def_rgb);
	    fill(0);
	    textSize(18);
	    text("No formula defined!\\n" +
		 "You need to define\\n" +
		 "  rgb(x, y) or rgb(x, y, t) or\\n" +
		 "  hsb(x, y) or hsb(x, y, t)\\n" +
		 "and click Run",
		 10, 29);
	}
    }
    switch(nArgs) {
    case 2:
	TIME_INCREMENT = 0;
	break;
    case 3:
	TIME_INCREMENT = TIME_INCREMENT==0 ? 1 : TIME_INCREMENT;
	break;
    default:
	//println("*** ERROR: you need to define " +
	//	"rgb(x,y) or rgb(x,y,t) or hsb(x,y) or hsb(x,y,t)");
	if(OUT_PAUSE) {
	    noLoop();
	}
	return;
    }
    // user init
    preSetup();
    // draw first frame
    drawFrame(FIRST_FRAME_TIME, FN);
    if(OUT_PAUSE) {
	noLoop();
    }
    if("" != "") {
	// save thumbnail
	try {
	    js_mathvision_done_fe10b9138ae11aa9ee53144515b4777e369e3d8d("", 0);
	}
	catch(err) {}
    }
}
void drawFrame(t, func) {
    if(preDraw(t)) {
	loadPixels();
	for(v=0; v<HEIGHT; v++) {
	    int y = map(v, 0, HEIGHT, Y_MAX, Y_MIN);
	    for(u=0; u<WIDTH; u++) {
		int x = map(u, 0, WIDTH, X_MIN, X_MAX);
		pixels[u+v*width] = func(x, y, t);
	    }
	}
	updatePixels();
	postDraw(t);
    }
}

var fpsFrameNr = 0;
var fpsStartTime = null;
var fps = null;
void updateFps() {
  if (!fpsFrameNr) {
	fpsStartTime = Date.now();
	++fpsFrameNr;
  }
  else if (fpsFrameNr < 50) {
	++fpsFrameNr;
  }
  else {
	let delta = (Date.now() - fpsStartTime) / 1000;
	fps = Math.round(fpsFrameNr / delta);
	fpsFrameNr = 0;
  }
}
int getFps() {
    return fps;
}
void draw() {
    if(TIME_INCREMENT==0) {
	noLoop();
    }
    else {
        updateFps();
	t += TIME_INCREMENT;
	drawFrame(t, FN);
    }
}
void makeFrames(adder, finisher) {
    var tt = t;
    var frames = (int)(FRAMES + 0.5);
    t = 0;
    if(false) {
	for(var i=0; i<frames; ++i) {
	    drawFrame(t, FN);
	    adder(i+1, frames);
	    t += TIME_INCREMENT;
	}
	finisher();
	return;
    }
    var i = 0;
    var f = function() {
	if(i<frames) {
	    drawFrame(t, FN);
	    adder(i+1, frames);
	    t += TIME_INCREMENT;
	    ++i;
	    setTimeout(f, 1);
	}
	else {
	    t = tt;
	    finisher();
	}
    };
    f();
}
void mouseClicked() {
    if(TIME_INCREMENT!=0 && CLICK_PAUSE) {
	t_on = !t_on;
	if(t_on)
	    loop();
	else {
	    noLoop();
	}
    }
}
void mouseOver() {
    if(OUT_PAUSE && TIME_INCREMENT!=0) {
	loop();
    }
}
void mouseOut() {
    if(OUT_PAUSE) {
	noLoop();
    }
}
void mouseMoved() {
    if(TIME_INCREMENT==0 && MOUSE_MOVE) {
	drawFrame(0, FN);
    }
}
// End of processing sketch @@@
`;
