alter table if exists access_requests
add column if not exists requested_environment text;

create index if not exists idx_access_requests_requested_environment
on access_requests(requested_environment);
