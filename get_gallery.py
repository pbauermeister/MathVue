#!/usr/bin/env python3

from collections import namedtuple
import argparse
import json
import os
import requests
import sys
from threading import Thread, Lock
from datetime import datetime

token = os.environ.get('TOKEN')

if not token:
    print(json.dumps(dict(error='Missing DropBox token as env var TOKEN')))
    sys.exit(1)

shared_url = 'https://www.dropbox.com/sh/7yva8osxs2mwuln/AABsf_PXDheqxGySYW4n2uV1a?dl=0'

headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
}

FileInfo = namedtuple('FileInfo', ('name', 'formula_url', 'thumb_url'))


def get_all_files(items=None, cursor=None):
    items = items or []
    if cursor:
        url = 'https://api.dropboxapi.com/2/files/list_folder/continue'
        response = requests.post(
            url,
            headers=headers,
            json=dict(cursor=cursor))
    else:
        url = 'https://api.dropboxapi.com/2/files/list_folder'
        response = requests.post(
            url,
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

    print(file=sys.stderr)
    print(url, file=sys.stderr)
    print(response.text, file=sys.stderr)
    print(response.headers, file=sys.stderr)
    print(file=sys.stderr)

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
    lock = Lock()

    def f(name, code_id):
        thumb_id = id_by_thumb.get(name+'.png')
        start = datetime.now()
        #print('>>>', name, 'id', thumb_id, file=sys.stderr)
        response = requests.post('https://api.dropboxapi.com/2/files/get_temporary_link',
                                 headers=headers,
                                 json=dict(path=code_id))
        duration = datetime.now() - start
        #print('<<<1 code url in', duration, name, file=sys.stderr)
        if response.ok:
            code_url = response.json()['link']
            thumb_url = None
            if thumb_id:
                response = requests.post('https://api.dropboxapi.com/2/files/get_temporary_link',
                                         headers=headers,
                                         json=dict(path=thumb_id))
                duration = datetime.now() - start
                #print('<<<2 thumb url after', duration, name, file=sys.stderr)
                if response.ok:
                    thumb_url = response.json()['link']
            with lock:
                res.append(FileInfo(name, code_url, thumb_url)._asdict())

    # create and run threads
    threads = [Thread(target=f, args=(name, code_id))
               for name, code_id in sorted(id_by_code.items())]
    for thread in threads: thread.start()
    for thread in threads: thread.join()

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
