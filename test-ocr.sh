#!/bin/bash

# Test OCR API with medication plan image
# Usage: ./test-ocr.sh <image-file>

IMAGE_FILE="${1:-test-images/medikationsplan.jpg}"
API_URL="http://localhost:3000/api/ocr/process"

if [ ! -f "$IMAGE_FILE" ]; then
    echo "Error: Image file $IMAGE_FILE not found!"
    exit 1
fi

echo "Testing OCR API with: $IMAGE_FILE"
echo "API Endpoint: $API_URL"
echo "----------------------------------------"

# Send request with curl
RESPONSE=$(curl -s -X POST \
    -F "image=@$IMAGE_FILE" \
    -F "sessionId=test-$(date +%s)" \
    $API_URL)

# Check if request was successful
if [ $? -eq 0 ]; then
    echo "Response received:"
    echo "$RESPONSE" | python3 -m json.tool
else
    echo "Error: Request failed"
fi