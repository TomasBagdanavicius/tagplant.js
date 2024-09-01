#!/usr/bin/env bash

# Fetch the container ID based on the container name
container_id=$(docker ps -q -f ancestor=tagplant)

# Check if the container is running
if [ -n "$container_id" ]; then
    # Stop the container
    docker stop "$container_id"
    echo "Container 'tagplant' with ID $container_id has been stopped."
else
    echo "No running container found with the name 'tagplant'."
fi