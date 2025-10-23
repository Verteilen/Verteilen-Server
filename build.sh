#!/bin/bash

if [ "$1" = "--publish" ];
then

echo "publish mode"
version=$(ts-node scripts/getversion.ts)
echo "version:" ${version}
docker tag e87870823/verteilen-server ghcr.io/verteilen/verteilen-server:${version}
docker push ghcr.io/verteilen/verteilen-server:${version}

else

echo "full mode"

docker build -t e87870823/verteilen-server -f ./deploy.Dockerfile . --progress=plain
read -p "Press enter to continue"

fi