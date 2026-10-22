#!/usr/bin/env bash
# Build the design preview into ./out and publish it to the gh-pages branch.
# GitHub Pages serves that branch at https://scencyk.github.io/casus-landing/
#
# The preview differs from production in three ways:
#   - paths: production assets live under /_l/ (nginx on casus.md), the preview sits in a
#     subfolder, so every /_l/ becomes ./
#   - the form: <html data-preview> makes main.js skip POST /api/waitlist (no backend here)
#   - links: "Zaloguj" points to casus.md, the logo to the preview root
set -euo pipefail
cd "$(dirname "$0")/.."

# /usr/bin/git on macOS is blocked until the Xcode licence is accepted — prefer the CLT binary.
CLT_GIT=/Library/Developer/CommandLineTools/usr/bin/git
GIT="${GIT:-$([ -x "$CLT_GIT" ] && echo "$CLT_GIT" || echo git)}"
# Authenticate the push with the gh CLI login when it is available.
AUTH=()
command -v gh >/dev/null && AUTH=(-c credential.helper= -c 'credential.helper=!gh auth git-credential')

REMOTE="$($GIT remote get-url origin)"
NAME="$($GIT config user.name)"
EMAIL="$($GIT config user.email)"

rewrite() {
  local file="$1"
  shift
  sed "$@" "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

rm -rf out
mkdir out
cp -R index.html style.css main.js assets fonts out/
rewrite out/index.html \
  -e 's#/_l/#./#g' \
  -e 's#<html lang="pl">#<html lang="pl" data-preview>#' \
  -e 's#href="/login"#href="https://casus.md/login"#g' \
  -e 's#href="/"#href="./"#g'
rewrite out/style.css -e 's#/_l/#./#g'
touch out/.nojekyll

cd out
rm -rf .git
$GIT init -q -b gh-pages
$GIT add -A
$GIT -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "deploy $(date -u +%Y-%m-%dT%H:%MZ)"
$GIT "${AUTH[@]}" push -q -f "$REMOTE" gh-pages
rm -rf .git
echo "Deployed → https://scencyk.github.io/casus-landing/"
