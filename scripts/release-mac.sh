#!/bin/sh
# The Mac desktop app, signed with the Developer ID certificate in this Mac's
# keychain, notarised with the App Store Connect key, and added to the draft
# GitHub release for this version (the release workflow makes the draft from
# the version tag; this works either way round).
set -eu
cd "$(dirname "$0")/.."
key_id=${APPLE_API_KEY_ID:-69VU7STUHU}
export APPLE_API_KEY="${APPLE_API_KEY:-$HOME/.appstoreconnect/private_keys/AuthKey_$key_id.p8}"
export APPLE_API_KEY_ID="$key_id"
export APPLE_API_ISSUER="${APPLE_API_ISSUER:-69a6de70-bb00-47e3-e053-5b8c7c11a4d1}"
export GH_TOKEN="${GH_TOKEN:-$(gh auth token)}"
npm test
npx electron-builder --mac --publish "${PUBLISH:-always}"
