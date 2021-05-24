#!/usr/bin/env python3

from collections import namedtuple
import argparse
import json
import os
import requests
import sys

token = os.environ.get('TOKEN')

if not token:
    print(json.dumps(dict(error='Missing DropBox token as env var TOKEN')))
    sys.exit(1)

shared_url = 'https://www.dropbox.com/sh/18v296344ohwyiy/AADyygfek6SDwHbk6i4PS7Zya?dl=0'
headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
}

FileInfo = namedtuple('FileInfo', ('name', 'formula_url', 'thumb_url'))

def get_all_files(items=None, cursor=None):
    items = items or []
    if cursor:
        response = requests.post(
            'https://api.dropboxapi.com/2/files/list_folder/continue',
            headers=headers,
            json=dict(cursor=cursor))
    else:
        response = requests.post(
            'https://api.dropboxapi.com/2/files/list_folder',
            headers=headers,
            json=dict(
                path='',
                  recursive=False,
                  include_media_info=True,
                  include_deleted=False,
                  include_has_explicit_shared_members=False,
                  include_mounted_folders=False,
                shared_link=dict(url=shared_url)
            ))

    response.raise_for_status()
    data = response.json()
    items += data['entries']

    if data['has_more']:
        get_all_files(items, data['cursor'])

    return items

def get_relevant_files_infos(suffix, items, startswith=None):
    nbi = {item['id']:item['name'] for item in items}
    if startswith:
        nbi = {k:v for k,v in nbi.items() if v.startswith(startswith)}
    code_by_id = {id:name for id, name in nbi.items() if name.endswith(suffix)}
    id_by_code = {name:id for id, name in nbi.items() if name.endswith(suffix)}
    id_by_thumb = {name:id for id, name in nbi.items() if name.endswith('.png')}

    res = []
    for name, code_id in sorted(id_by_code.items()):
        thumb_id = id_by_thumb.get(name+'.png')
        #print("***", name, thumb_id)
        response = requests.post('https://api.dropboxapi.com/2/files/get_temporary_link',
                                 headers=headers,
                                 json=dict(path=code_id))
        if response.ok:
            code_url = response.json()['link']
            thumb_url = None
            if thumb_id:
                response = requests.post('https://api.dropboxapi.com/2/files/get_temporary_link',
                                         headers=headers,
                                         json=dict(path=thumb_id))
                if response.ok:
                    thumb_url = response.json()['link']
            res.append(FileInfo(name, code_url, thumb_url)._asdict())
    return res

def parse_args():
    parser = argparse.ArgumentParser(description='Get DropBox MathVue public files.')
    parser.add_argument('--suffix', required=True,
                        help='.c | .formula')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--names', action='store_true',
                       help='list names of code files')
    group.add_argument('--links', action='store_true',
                       help='list links of code files')
    group.add_argument('--startswith',
                       help='list links of code files, for matching files')
    return parser.parse_args()

args = parse_args()
items = get_all_files()
names = sorted([item['name'] for item in items if item['name'].endswith(args.suffix)])

if args.names:
    print(json.dumps(dict(names=names)))
elif args.links:
    infos = get_relevant_files_infos(args.suffix, items)
    print(json.dumps(dict(entries=infos), indent='  ', sort_keys=True))
elif args.startswith:
    infos = get_relevant_files_infos(args.suffix, items, args.startswith)
    print(json.dumps(dict(entries=infos), indent='  ', sort_keys=True))
