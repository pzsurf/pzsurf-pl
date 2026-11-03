#!/usr/bin/env bash
# The member-area toggle's promise, checked against the BUILT site.
#
#   PUBLIC_MEMBER_AREA != "true"   dist/ holds nothing of the feature: no
#                                  /konto/ or /dolacz/ pages, no member API
#                                  address, no Firebase SDK
#   PUBLIC_MEMBER_AREA == "true"   dist/konto/index.html exists
#
# Run by ci.yml and deploy.yml after the build, with the same environment the
# build had. Locally: PUBLIC_MEMBER_AREA=... .github/scripts/check-member-area.sh
set -euo pipefail

dist="${1:-dist}"
fail() { echo "::error::$1"; exit 1; }

test -s "$dist/index.html" || fail "$dist/index.html is missing: build first"

if [ "${PUBLIC_MEMBER_AREA:-}" = "true" ]; then
  test -s "$dist/konto/index.html" \
    || fail "member area is ON but $dist/konto/index.html is missing"
  echo "member area ON: $dist/konto/index.html present"
  exit 0
fi

for dir in konto dolacz; do
  [ ! -e "$dist/$dir" ] || fail "member area is OFF but $dist/$dir exists"
done

# Fixed strings, anywhere in the output (HTML, JS, CSS, maps). `api.pzsurf.pl`
# is the member API's address; `firebaseapp` appears in every Firebase SDK
# config (authDomain) and so stands in for the SDK itself.
if leaks=$(grep -rlF -e "api.pzsurf.pl" -e "firebaseapp" "$dist"); then
  echo "$leaks"
  fail "member area is OFF but the files above mention it"
fi
echo "member area OFF: nothing of it in $dist"
