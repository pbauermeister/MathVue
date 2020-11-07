#!/usr/bin/python3

with open('wasm/formula.c') as f:
    prolog = f.read()
    print(len(prolog.split('\n')))
