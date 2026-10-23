#!/usr/bin/env bash
# Sourced after mktemp; this trap owns only that harness's private cluster.
cleanup_isolated_postgres() {
  local test_result=$?
  trap - EXIT
  case "$(basename "$database_dir")" in
    digitalmaktab-core-support.*|digitalmaktab-af-academic.*) ;;
    *) echo "Refusing cleanup outside a private test-cluster directory" >&2; exit "$test_result" ;;
  esac
  if [[ -L "$database_dir" ]]; then echo "Refusing symlinked test-cluster cleanup" >&2; exit "$test_result"; fi
  pg_ctl -D "$database_dir/data" -m fast -t 10 -w stop >> "$database_dir/server.log" 2>&1 || true
  if pg_ctl -D "$database_dir/data" status >/dev/null 2>&1 || [[ -f "$database_dir/data/postmaster.pid" ]]; then
    echo "Private test cluster retained because shutdown could not be verified: $database_dir" >&2
    if [[ "$test_result" == 0 ]]; then exit 1; else exit "$test_result"; fi
  fi
  # Preserve bounded diagnostics on failure, including when initdb fails. A
  # full filesystem must not prevent reclaiming this stopped private cluster.
  if [[ "$test_result" != 0 ]]; then
    local failure_dir
    if failure_dir=$(mktemp -d "${TMPDIR:-/private/tmp}/digitalmaktab-test-failure.XXXXXX"); then
      for log_name in init server; do
        if [[ -f "$database_dir/$log_name.log" ]]; then
          tail -c 262144 "$database_dir/$log_name.log" > "$failure_dir/$log_name.log" || true
        fi
      done
      echo "Private test failure logs: $failure_dir" >&2
    fi
  fi
  rm -rf -- "$database_dir"
  exit "$test_result"
}
trap cleanup_isolated_postgres EXIT
