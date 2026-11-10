#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${PG_CONTAINER:-iba-english-postgres-1}"

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="${POSTGRES_PASSWORD:-change-me}" psql -h "${PG_HOST:-127.0.0.1}" -U iba -d iba_testing -v ON_ERROR_STOP=1 "$@"
  else
    docker exec -i "$CONTAINER" psql -U iba -d iba_testing -v ON_ERROR_STOP=1 "$@"
  fi
}

run_psql <<'SQL'
begin;

delete from tests where title like 'Нагрузка – %';

delete from notifications n
where n.body like 'Нагрузка %'
   or (n.type = 'NEW_DEVICE_LOGIN' and exists (
         select 1 from known_devices d
         where d.user_id = n.user_id
           and d.fingerprint = encode(sha256('iba-load-test'::bytea), 'hex')
           and n.created_at >= d.created_at));
delete from known_devices where fingerprint = encode(sha256('iba-load-test'::bytea), 'hex');

with load_users as (select id from users where email like 'load-%@example.com')
delete from tests where owner_id in (select id from load_users);
delete from media_assets where owner_id in (select id from users where email like 'load-%@example.com');
delete from audit_events where actor_id in (select id from users where email like 'load-%@example.com');
delete from audit_events where target_id in (select id from users where email like 'load-%@example.com');
delete from users where email like 'load-%@example.com';

commit;
SQL

echo "Очистка завершена"
