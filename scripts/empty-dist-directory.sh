#!/usr/bin/env bash
dir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
project_dir=$(readlink -f "$dir/..")
destination_dir=$project_dir/dist
rm -rf $destination_dir/*