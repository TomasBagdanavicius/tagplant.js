#!/usr/bin/env bash
dir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
project_dir=$(readlink -f "$dir/..")

rm -rf "$project_dir/node_modules"
rm "$project_dir/package-lock.json"