#!/bin/bash
#node --inspect-brk=localhost:9230 ./node_modules/.bin/jest --detectOpenHandles $*
node --inspect-brk=0.0.0.0 $(dirname $0)/../node_modules/.bin/jest --detectOpenHandles $*
