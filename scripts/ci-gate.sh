#!/usr/bin/env bash
# Runs one quality gate's command in CI and passes its exit code through.
#
#   scripts/ci-gate.sh <gate> <command...>
#
# GATE_BLOCKING=false (set from the CI plan) turns a failure into a warning.
#
# For the template's own fixture runs only: with EXPECT_FAILURE=<gate>, the gate
# passes only if the command fails, and, when EXPECT_OUTPUT is set, only if
# the output contains that text. That's how CI proves a gate catches what it
# should (e.g. the a11y gate reporting "image-alt").

set -uo pipefail

gate="$1"
shift
log=$(mktemp)
trap 'rm -f "$log"' EXIT

"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [ "${EXPECT_FAILURE:-}" != "$gate" ]; then
  # Non-blocking gates (prototype mode) report findings without failing the
  # job, so their check stays green and branch protection only blocks on
  # gates that are meant to block.
  if [ "$status" -ne 0 ] && [ "${GATE_BLOCKING:-true}" = "false" ]; then
    echo "::warning::$gate failed (exit $status) but doesn't block in this mode. See the output above."
    exit 0
  fi
  exit "$status"
fi
if [ "$status" -eq 0 ]; then
  echo "::error::$gate was expected to fail but passed"
  exit 1
fi
if [ -n "${EXPECT_OUTPUT:-}" ] && ! grep -qF -- "$EXPECT_OUTPUT" "$log"; then
  echo "::error::$gate failed, but its output doesn't mention '$EXPECT_OUTPUT'"
  exit 1
fi
echo "$gate failed as expected${EXPECT_OUTPUT:+ (found '$EXPECT_OUTPUT')}"
