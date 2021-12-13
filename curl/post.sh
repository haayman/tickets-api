#!/bin/bash
fn=$1
curl -X POST -H "Content-Type: application/json" -d @${fn} http://localhost:3000/api/reservering
