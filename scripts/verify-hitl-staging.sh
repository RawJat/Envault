#!/bin/bash
# verify-hitl-staging.sh (macOS Optimized)

if [ -z "$ENVAULT_TOKEN" ] || [ -z "$ENVAULT_BASE_URL" ]; then
  echo "Error: ENVAULT_TOKEN and ENVAULT_BASE_URL must be set."
  exit 1
fi

ENDPOINT="${ENVAULT_BASE_URL}/api/sdk/secrets"
PAYLOAD='{"project_id":"mock-project","environment":"staging","secrets":{"MOCK_SECRET":"mock_value"}}'

echo "Testing HITL Mutation Endpoint: $ENDPOINT"

# macOS-safe temporary file creation
RESPONSE_FILE=$(mktemp /tmp/envault_hitl.XXXXXX)

STATUS_CODE=$(curl -L -s -w "%{http_code}" -o "$RESPONSE_FILE" -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $ENVAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

BODY=$(cat "$RESPONSE_FILE")
rm -f "$RESPONSE_FILE"

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