#!/usr/bin/env bash
# Exercise dpkg's whole-package replacement against the actual built artifact, in a private root.
set -euo pipefail
package=$(realpath "$1")
new_name=$(dpkg-deb -f "$package" Package)
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
for old in vibe-tox-lis open-bga-tox steady-state-lims; do
  root="$fixture/$old/root"
  old_package="$fixture/$old/package"
  mkdir -p "$root/var/lib/dpkg" "$old_package/DEBIAN" "$old_package/usr/bin" "$root/preserved-data"
  touch "$root/var/lib/dpkg/status"
  echo 'synthetic installation data' > "$root/preserved-data/sentinel"
  cat > "$old_package/DEBIAN/control" <<CONTROL
Package: $old
Version: 0.1.1
Architecture: amd64
Maintainer: Synthetic Test <test@example.invalid>
Description: Synthetic previous package ownership
CONTROL
  echo 'previous executable' > "$old_package/usr/bin/lis-desktop"
  dpkg-deb --build "$old_package" "$fixture/$old.deb"
  # No maintainer scripts exist in these packages. Never run against the host dpkg database.
  fakeroot dpkg --root "$root" --force-depends -i "$fixture/$old.deb" "$package"
  test "$(dpkg-query --admindir="$root/var/lib/dpkg" -W -f='${Status}' "$new_name")" = 'install ok installed'
  test "$(dpkg-query --admindir="$root/var/lib/dpkg" -S /usr/bin/lis-desktop)" = "$new_name: /usr/bin/lis-desktop"
  test "$(cat "$root/preserved-data/sentinel")" = 'synthetic installation data'
  # A repeated upgrade and remove use the same ownership; data outside the package survives.
  fakeroot dpkg --root "$root" --force-depends -i "$package"
  fakeroot dpkg --root "$root" --remove "$new_name"
  test -f "$root/preserved-data/sentinel"
  test ! -e "$root/usr/bin/lis-desktop"
done
