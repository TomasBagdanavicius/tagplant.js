#!/usr/bin/env bash

docker build -t tagplant .
docker run -p 8081:8081 -d tagplant
echo "http://localhost:8081/"
echo "http://localhost:8081/demo/slides.html"