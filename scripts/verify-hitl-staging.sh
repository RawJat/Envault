#!/bin/bash

# verify-hitl-staging.sh
# Creates a mock payload and sends it to the HITL pipeline to verify proper interception.

if [ -z "$ENVAULT_TOKEN" ] || [ -z "$ENVAULT_BASE_URL" ]; then
  echo "Error: ENVAULT_TOKEN and ENVAULT_BASE_URL must be set."
  exit 1
fi

ENDPOINT="${ENVAULT_BASE_URL}/api/sdk/secrets"
PAYLOAD='{"project_id":"mock-project","environment":"staging","secrets":{"MOCK_SECRET":"mock_value"}}'

echo "Testing HITL Mutation Endpoint: $ENDPOINT"

# Execute curl request, capturing HTTP status code and response body separately
RESPONSE_FILE=$(mktemp)
STATUS_CODE=$(curl -L -s -w "%{http_code}" -o "$RESPONSE_FILE" -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $ENVAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

BODY=$(cat "$RESPONSE_FILE")
rm -f "$RESPONSE_FILE"

# Evaluate the HTTP status code
if [ "$STATUS_CODE" -eq 202 ]; then
  echo -e "\033[0;32mHITL Gate Active: Mutation safely queued for approval.\033[0m"
  exit 0
elif [ "$STATUS_CODE" -eq 200 ] || [ "$STATUS_CODE" -eq 201 ]; then
  echo -e "\033[0;31mCRITICAL: HITL Gate Bypassed. Direct write occurred.\033[0m"
  exit 1
else
  echo -e "\033[0;31mError: Received HTTP $STATUS_CODE\033[0m"
  echo "Response Body: $BODY"
  exit 1
fi
