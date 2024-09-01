#!/bin/bash
version=""
while getopts "v:" arg; do
    case $arg in
        v)
            version=$OPTARG
            ;;
        *)
            echo "Invalid option: -$OPTARG" >&2
            exit 1
            ;;
    esac
done
# Checks if value of $version is empty
if [[ -z $version ]]; then
    echo "Error: -v option is mandatory" >&2
    exit 1
fi

dir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
project_dir=$(readlink -f "$dir/..")

$project_dir/scripts/prepare-build.sh
rm -rf $project_dir/demo/api/uploads/*