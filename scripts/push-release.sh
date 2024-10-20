#!/bin/bash

# Confirmation prompt
read -p "Are you sure you want to push a new release? [Y/N] " confirm
if [[ $confirm != [yY] ]]; then
    echo "Script execution aborted."
    exit 1
fi
while getopts ":v:c:t:" opt; do
    case ${opt} in
        v )
            version=$OPTARG
            ;;
        c )
            commit_message=$OPTARG
            ;;
        t )
            tag_message=$OPTARG
            ;;
        \? )
            echo "Invalid option: $OPTARG" 1>&2
            exit 1
            ;;
        : )
            echo "Invalid option: $OPTARG requires an argument" 1>&2
            exit 1
            ;;
    esac
done
shift $((OPTIND -1))

# Check if all three parameters are present
if [ -z "$version" ] || [ -z "$commit_message" ] || [ -z "$tag_message" ]; then
    echo "Error: Please specify all three parameters -v, -c, and -t"
    exit 1
fi

dir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
project_dir=$(readlink -f "$dir/..")
tag="v$version"

cd $project_dir
git add .
git commit -S -m "$commit_message"
git push
git tag -s $tag -m "$tag_message"
git push origin $tag