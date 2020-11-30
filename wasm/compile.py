#!/usr/bin/python3

import base64
import glob
import os
import shutil
import subprocess
import sys
import tempfile

formula = sys.argv[1]
PROGRAM = 'wrapper.c'

os.chdir('wasm')

# find all subdirectories
dirs = [os.path.split(d)[0] for d in glob.glob('*' + os.sep)]

CMD = (f'emcc {PROGRAM} '
#       '-Os '  # avoid optim > 2 as it wil minify the identifiers.
#       '-O3 --profiling-funcs --profiling -g3 '  # no good
       '-O2 '

       '-s WASM=1 '
       '-o out.js')

with tempfile.TemporaryDirectory(prefix='wasmCompile') as d:
    shutil.copyfile(PROGRAM, os.path.join(d, PROGRAM))
    # copy subdirs to tempdir
    for src in dirs:
        shutil.copytree(src, os.path.join(d, src))

    # compile program
    os.chdir(d)
    # - assemble source file
    with open('formula.c', 'w') as f:
        f.write(formula)
    # - compile
    subprocess.check_call(CMD.split())
    # - read result
    with open('out.wasm', 'rb') as f:
        wasm = f.read()

wasm_b64 = base64.b64encode(wasm)
wasm_b64_str = wasm_b64.decode('utf-8')
print(wasm_b64_str)
