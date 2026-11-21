---
date: 2026-11-20
type: changed
impact: low
title: Choose Compact, Default or Wide navigation width
---
The … menu at the top of the navigation now offers Compact, Default and Wide instead of Narrower navigation, Wider navigation and Reset navigation width, with a check mark on the width in use. Default is a little wider than before and is the width the navigation opens with the first time. Dragging the right edge still sets any width in between, and the width is remembered across restarts.

## Technical notes

The saved navigation layout (`vibe-tox.navigation.layout-v1` in the webview's local storage) gains a `preset` field. A layout saved without it at the old 256-pixel first-start width opens at Default (288 pixels); any other saved width is kept.
