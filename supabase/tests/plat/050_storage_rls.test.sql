-- M1-P1 step 9: storage buckets and policies. Allowed role passes, other role fails, other tenant fails
-- (read, list, insert, update, delete), for every bucket and every role.
-- Generated shape: one block per bucket. `a`/`b` are the fixture institutions from tests/helpers.sql.
begin;

select plan(111);

select tests.create_fixture();

-- Seed one object per bucket in each institution (as the owner role, which bypasses RLS).
insert into storage.objects (bucket_id, name)
select b, tests.inst(w)::text || '/' || f
from unnest(array['logos', 'photos', 'imports', 'exports']) b, unnest(array['a', 'b']) w,
     unnest(array['seed.png', 'upd.png', 'other-upd.png', 'mv.png', 'del.png', 'other-del.png', 'teacher-del.png']) f;

-- Rows visible to a user for a query; a missing privilege counts as 0 rows.
create function pg_temp.seen(which text, role text, q text)
returns bigint language plpgsql as $$
declare n bigint;
begin
  perform tests.act_as(which, role);
  begin
    execute 'select count(*) from (' || q || ') s' into n;
  exception when insufficient_privilege then n := 0;
  end;
  perform tests.reset();
  return n;
end;
$$;

create function pg_temp.seen_anon(q text)
returns bigint language plpgsql as $$
declare n bigint;
begin
  perform tests.act_as_anon();
  begin
    execute 'select count(*) from (' || q || ') s' into n;
  exception when insufficient_privilege then n := 0;
  end;
  perform tests.reset();
  return n;
end;
$$;

create function pg_temp.try_insert(which text, role text, bucket text, path text)
returns boolean language plpgsql as $$
begin
  perform tests.act_as(which, role);
  begin
    insert into storage.objects (bucket_id, name) values (bucket, path);
  exception when others then
    perform tests.reset();
    return false;
  end;
  perform tests.reset();
  return true;
end;
$$;

-- Rows changed by an update of the object's metadata (-1 when the statement raised).
create function pg_temp.try_update(which text, role text, bucket text, path text, new_name text)
returns integer language plpgsql as $$
declare n integer;
begin
  perform tests.act_as(which, role);
  begin
    update storage.objects set name = new_name where bucket_id = bucket and name = path;
    get diagnostics n = row_count;
  exception when others then
    perform tests.reset();
    return -1;
  end;
  perform tests.reset();
  return n;
end;
$$;

create function pg_temp.try_delete(which text, role text, bucket text, path text)
returns integer language plpgsql as $$
declare n integer;
begin
  perform set_config('storage.allow_delete_query', 'true', true);
  perform tests.act_as(which, role);
  begin
    delete from storage.objects where bucket_id = bucket and name = path;
    get diagnostics n = row_count;
  exception when others then
    perform tests.reset();
    return -1;
  end;
  perform tests.reset();
  return n;
end;
$$;

-- Buckets: private, with limits and file types.

select is((select count(*)::int from storage.buckets where id in ('logos', 'photos', 'imports', 'exports') and public = false), 4, 'the four buckets exist and none is public');
select is((select count(*)::int from storage.buckets where id in ('logos', 'photos', 'imports', 'exports') and file_size_limit > 0 and cardinality(allowed_mime_types) > 0), 4, 'every bucket has a size limit and allowed file types');
select is((select file_size_limit from storage.buckets where id = 'logos'), 1048576::bigint, 'logos limit is 1 MiB');
select is((select file_size_limit from storage.buckets where id = 'imports'), 10485760::bigint, 'imports limit is 10 MiB');
select is(private.storage_institution(tests.inst('a')::text || '/x/y.png'), tests.inst('a'), 'the institution comes from the first folder');
select is(private.storage_institution('loose.png'), null, 'an object with no folder belongs to no institution');
select is(private.storage_institution('not-a-uuid/x.png'), null, 'a first folder that is not a uuid belongs to no institution');

-- ===== logos =====
select is(pg_temp.seen('a', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'logos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'logos: institution_admin A reads their institution''s object');
select is(pg_temp.seen('a', 'teacher', format($q$select 1 from storage.objects where bucket_id = 'logos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'logos: teacher A reads their institution''s object');
select is(pg_temp.seen('a', 'accountant', format($q$select 1 from storage.objects where bucket_id = 'logos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'logos: accountant A reads their institution''s object');
select is(pg_temp.seen('a', 'guardian', format($q$select 1 from storage.objects where bucket_id = 'logos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'logos: guardian A reads their institution''s object');
select is(pg_temp.seen('a', 'student', format($q$select 1 from storage.objects where bucket_id = 'logos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'logos: student A reads their institution''s object');
select is(pg_temp.seen('a', 'institution_admin', $q$select 1 from storage.objects where bucket_id = 'logos'$q$), 7::bigint, 'logos: listing as admin A lists exactly institution A''s 7 objects (never B''s)');
select is(pg_temp.seen('b', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'logos' and name like %L$q$, tests.inst('a')::text || '/%')), 0::bigint, 'logos: institution_admin B cannot read or list institution A''s objects (other tenant)');
select is(pg_temp.seen('b', 'teacher', format($q$select 1 from storage.objects where bucket_id = 'logos' and name like %L$q$, tests.inst('a')::text || '/%')), 0::bigint, 'logos: teacher B cannot read or list institution A''s objects (other tenant)');
select is(pg_temp.seen('platform', 'platform_owner', $q$select 1 from storage.objects where bucket_id = 'logos'$q$), 0::bigint, 'logos: a platform owner sees nothing without an impersonation session');
select is(pg_temp.seen('none', 'outsider', $q$select 1 from storage.objects where bucket_id = 'logos'$q$), 0::bigint, 'logos: a user with no membership sees nothing');
select is(pg_temp.seen_anon($q$select 1 from storage.objects where bucket_id = 'logos'$q$), 0::bigint, 'logos: anon sees nothing');
select is(pg_temp.try_insert('a', 'institution_admin', 'logos', tests.inst('a')::text || '/new-institution_admin.png'), true, 'logos: institution_admin A can upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'teacher', 'logos', tests.inst('a')::text || '/new-teacher.png'), false, 'logos: teacher A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'accountant', 'logos', tests.inst('a')::text || '/new-accountant.png'), false, 'logos: accountant A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'guardian', 'logos', tests.inst('a')::text || '/new-guardian.png'), false, 'logos: guardian A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'student', 'logos', tests.inst('a')::text || '/new-student.png'), false, 'logos: student A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('b', 'institution_admin', 'logos', tests.inst('a')::text || '/forged.png'), false, 'logos: admin B cannot upload under institution A''s folder (other tenant)');
select is(pg_temp.try_insert('a', 'institution_admin', 'logos', 'loose.png'), false, 'logos: admin A cannot upload outside any institution folder');
select is(pg_temp.try_insert('a', 'institution_admin', 'logos', 'not-a-uuid/x.png'), false, 'logos: admin A cannot upload under a folder that is not an institution id');
select is(pg_temp.try_update('a', 'institution_admin', 'logos', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 1, 'logos: institution_admin A can update their institution''s object');
select is(pg_temp.try_update('a', 'teacher', 'logos', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 0, 'logos: teacher A cannot update their institution''s object');
select is(pg_temp.try_update('b', 'institution_admin', 'logos', tests.inst('a')::text || '/other-upd.png', tests.inst('b')::text || '/stolen.png'), 0, 'logos: admin B cannot update institution A''s object (other tenant)');
select is(pg_temp.try_update('a', 'institution_admin', 'logos', tests.inst('a')::text || '/mv.png', tests.inst('b')::text || '/moved.png'), -1, 'logos: admin A cannot move an object into institution B''s folder');
select is(pg_temp.try_delete('b', 'institution_admin', 'logos', tests.inst('a')::text || '/other-del.png'), 0, 'logos: admin B cannot delete institution A''s object (other tenant)');
select is(pg_temp.try_delete('a', 'teacher', 'logos', tests.inst('a')::text || '/teacher-del.png'), 0, 'logos: teacher A cannot delete');
select is(pg_temp.try_delete('a', 'institution_admin', 'logos', tests.inst('a')::text || '/del.png'), 1, 'logos: admin A can delete their institution''s object');

-- ===== photos =====
select is(pg_temp.seen('a', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'photos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'photos: institution_admin A reads their institution''s object');
select is(pg_temp.seen('a', 'teacher', format($q$select 1 from storage.objects where bucket_id = 'photos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'photos: teacher A reads their institution''s object');
select is(pg_temp.seen('a', 'accountant', format($q$select 1 from storage.objects where bucket_id = 'photos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'photos: accountant A reads their institution''s object');
select is(pg_temp.seen('a', 'guardian', format($q$select 1 from storage.objects where bucket_id = 'photos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'photos: guardian A cannot read their institution''s object');
select is(pg_temp.seen('a', 'student', format($q$select 1 from storage.objects where bucket_id = 'photos' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'photos: student A cannot read their institution''s object');
select is(pg_temp.seen('a', 'institution_admin', $q$select 1 from storage.objects where bucket_id = 'photos'$q$), 7::bigint, 'photos: listing as admin A lists exactly institution A''s 7 objects (never B''s)');
select is(pg_temp.seen('b', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'photos' and name like %L$q$, tests.inst('a')::text || '/%')), 0::bigint, 'photos: institution_admin B cannot read or list institution A''s objects (other tenant)');
select is(pg_temp.seen('b', 'teacher', format($q$select 1 from storage.objects where bucket_id = 'photos' and name like %L$q$, tests.inst('a')::text || '/%')), 0::bigint, 'photos: teacher B cannot read or list institution A''s objects (other tenant)');
select is(pg_temp.seen('platform', 'platform_owner', $q$select 1 from storage.objects where bucket_id = 'photos'$q$), 0::bigint, 'photos: a platform owner sees nothing without an impersonation session');
select is(pg_temp.seen('none', 'outsider', $q$select 1 from storage.objects where bucket_id = 'photos'$q$), 0::bigint, 'photos: a user with no membership sees nothing');
select is(pg_temp.seen_anon($q$select 1 from storage.objects where bucket_id = 'photos'$q$), 0::bigint, 'photos: anon sees nothing');
select is(pg_temp.try_insert('a', 'institution_admin', 'photos', tests.inst('a')::text || '/new-institution_admin.png'), true, 'photos: institution_admin A can upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'teacher', 'photos', tests.inst('a')::text || '/new-teacher.png'), false, 'photos: teacher A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'accountant', 'photos', tests.inst('a')::text || '/new-accountant.png'), false, 'photos: accountant A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'guardian', 'photos', tests.inst('a')::text || '/new-guardian.png'), false, 'photos: guardian A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'student', 'photos', tests.inst('a')::text || '/new-student.png'), false, 'photos: student A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('b', 'institution_admin', 'photos', tests.inst('a')::text || '/forged.png'), false, 'photos: admin B cannot upload under institution A''s folder (other tenant)');
select is(pg_temp.try_insert('a', 'institution_admin', 'photos', 'loose.png'), false, 'photos: admin A cannot upload outside any institution folder');
select is(pg_temp.try_insert('a', 'institution_admin', 'photos', 'not-a-uuid/x.png'), false, 'photos: admin A cannot upload under a folder that is not an institution id');
select is(pg_temp.try_update('a', 'institution_admin', 'photos', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 1, 'photos: institution_admin A can update their institution''s object');
select is(pg_temp.try_update('a', 'teacher', 'photos', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 0, 'photos: teacher A cannot update their institution''s object');
select is(pg_temp.try_update('b', 'institution_admin', 'photos', tests.inst('a')::text || '/other-upd.png', tests.inst('b')::text || '/stolen.png'), 0, 'photos: admin B cannot update institution A''s object (other tenant)');
select is(pg_temp.try_update('a', 'institution_admin', 'photos', tests.inst('a')::text || '/mv.png', tests.inst('b')::text || '/moved.png'), -1, 'photos: admin A cannot move an object into institution B''s folder');
select is(pg_temp.try_delete('b', 'institution_admin', 'photos', tests.inst('a')::text || '/other-del.png'), 0, 'photos: admin B cannot delete institution A''s object (other tenant)');
select is(pg_temp.try_delete('a', 'teacher', 'photos', tests.inst('a')::text || '/teacher-del.png'), 0, 'photos: teacher A cannot delete');
select is(pg_temp.try_delete('a', 'institution_admin', 'photos', tests.inst('a')::text || '/del.png'), 1, 'photos: admin A can delete their institution''s object');

-- ===== imports =====
select is(pg_temp.seen('a', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'imports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'imports: institution_admin A reads their institution''s object');
select is(pg_temp.seen('a', 'teacher', format($q$select 1 from storage.objects where bucket_id = 'imports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'imports: teacher A cannot read their institution''s object');
select is(pg_temp.seen('a', 'accountant', format($q$select 1 from storage.objects where bucket_id = 'imports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'imports: accountant A cannot read their institution''s object');
select is(pg_temp.seen('a', 'guardian', format($q$select 1 from storage.objects where bucket_id = 'imports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'imports: guardian A cannot read their institution''s object');
select is(pg_temp.seen('a', 'student', format($q$select 1 from storage.objects where bucket_id = 'imports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'imports: student A cannot read their institution''s object');
select is(pg_temp.seen('a', 'institution_admin', $q$select 1 from storage.objects where bucket_id = 'imports'$q$), 7::bigint, 'imports: listing as admin A lists exactly institution A''s 7 objects (never B''s)');
select is(pg_temp.seen('b', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'imports' and name like %L$q$, tests.inst('a')::text || '/%')), 0::bigint, 'imports: institution_admin B cannot read or list institution A''s objects (other tenant)');
select is(pg_temp.seen('platform', 'platform_owner', $q$select 1 from storage.objects where bucket_id = 'imports'$q$), 0::bigint, 'imports: a platform owner sees nothing without an impersonation session');
select is(pg_temp.seen('none', 'outsider', $q$select 1 from storage.objects where bucket_id = 'imports'$q$), 0::bigint, 'imports: a user with no membership sees nothing');
select is(pg_temp.seen_anon($q$select 1 from storage.objects where bucket_id = 'imports'$q$), 0::bigint, 'imports: anon sees nothing');
select is(pg_temp.try_insert('a', 'institution_admin', 'imports', tests.inst('a')::text || '/new-institution_admin.png'), true, 'imports: institution_admin A can upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'teacher', 'imports', tests.inst('a')::text || '/new-teacher.png'), false, 'imports: teacher A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'accountant', 'imports', tests.inst('a')::text || '/new-accountant.png'), false, 'imports: accountant A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'guardian', 'imports', tests.inst('a')::text || '/new-guardian.png'), false, 'imports: guardian A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'student', 'imports', tests.inst('a')::text || '/new-student.png'), false, 'imports: student A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('b', 'institution_admin', 'imports', tests.inst('a')::text || '/forged.png'), false, 'imports: admin B cannot upload under institution A''s folder (other tenant)');
select is(pg_temp.try_insert('a', 'institution_admin', 'imports', 'loose.png'), false, 'imports: admin A cannot upload outside any institution folder');
select is(pg_temp.try_insert('a', 'institution_admin', 'imports', 'not-a-uuid/x.png'), false, 'imports: admin A cannot upload under a folder that is not an institution id');
select is(pg_temp.try_update('a', 'institution_admin', 'imports', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 1, 'imports: institution_admin A can update their institution''s object');
select is(pg_temp.try_update('a', 'teacher', 'imports', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 0, 'imports: teacher A cannot update their institution''s object');
select is(pg_temp.try_update('b', 'institution_admin', 'imports', tests.inst('a')::text || '/other-upd.png', tests.inst('b')::text || '/stolen.png'), 0, 'imports: admin B cannot update institution A''s object (other tenant)');
select is(pg_temp.try_update('a', 'institution_admin', 'imports', tests.inst('a')::text || '/mv.png', tests.inst('b')::text || '/moved.png'), -1, 'imports: admin A cannot move an object into institution B''s folder');
select is(pg_temp.try_delete('b', 'institution_admin', 'imports', tests.inst('a')::text || '/other-del.png'), 0, 'imports: admin B cannot delete institution A''s object (other tenant)');
select is(pg_temp.try_delete('a', 'teacher', 'imports', tests.inst('a')::text || '/teacher-del.png'), 0, 'imports: teacher A cannot delete');
select is(pg_temp.try_delete('a', 'institution_admin', 'imports', tests.inst('a')::text || '/del.png'), 1, 'imports: admin A can delete their institution''s object');

-- ===== exports =====
select is(pg_temp.seen('a', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'exports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'exports: institution_admin A reads their institution''s object');
select is(pg_temp.seen('a', 'teacher', format($q$select 1 from storage.objects where bucket_id = 'exports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'exports: teacher A cannot read their institution''s object');
select is(pg_temp.seen('a', 'accountant', format($q$select 1 from storage.objects where bucket_id = 'exports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 1::bigint, 'exports: accountant A reads their institution''s object');
select is(pg_temp.seen('a', 'guardian', format($q$select 1 from storage.objects where bucket_id = 'exports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'exports: guardian A cannot read their institution''s object');
select is(pg_temp.seen('a', 'student', format($q$select 1 from storage.objects where bucket_id = 'exports' and name = %L$q$, tests.inst('a')::text || '/seed.png')), 0::bigint, 'exports: student A cannot read their institution''s object');
select is(pg_temp.seen('a', 'institution_admin', $q$select 1 from storage.objects where bucket_id = 'exports'$q$), 7::bigint, 'exports: listing as admin A lists exactly institution A''s 7 objects (never B''s)');
select is(pg_temp.seen('b', 'institution_admin', format($q$select 1 from storage.objects where bucket_id = 'exports' and name like %L$q$, tests.inst('a')::text || '/%')), 0::bigint, 'exports: institution_admin B cannot read or list institution A''s objects (other tenant)');
select is(pg_temp.seen('b', 'accountant', format($q$select 1 from storage.objects where bucket_id = 'exports' and name like %L$q$, tests.inst('a')::text || '/%')), 0::bigint, 'exports: accountant B cannot read or list institution A''s objects (other tenant)');
select is(pg_temp.seen('platform', 'platform_owner', $q$select 1 from storage.objects where bucket_id = 'exports'$q$), 0::bigint, 'exports: a platform owner sees nothing without an impersonation session');
select is(pg_temp.seen('none', 'outsider', $q$select 1 from storage.objects where bucket_id = 'exports'$q$), 0::bigint, 'exports: a user with no membership sees nothing');
select is(pg_temp.seen_anon($q$select 1 from storage.objects where bucket_id = 'exports'$q$), 0::bigint, 'exports: anon sees nothing');
select is(pg_temp.try_insert('a', 'institution_admin', 'exports', tests.inst('a')::text || '/new-institution_admin.png'), false, 'exports: institution_admin A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'teacher', 'exports', tests.inst('a')::text || '/new-teacher.png'), false, 'exports: teacher A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'accountant', 'exports', tests.inst('a')::text || '/new-accountant.png'), false, 'exports: accountant A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'guardian', 'exports', tests.inst('a')::text || '/new-guardian.png'), false, 'exports: guardian A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('a', 'student', 'exports', tests.inst('a')::text || '/new-student.png'), false, 'exports: student A cannot upload under their institution''s folder');
select is(pg_temp.try_insert('b', 'institution_admin', 'exports', tests.inst('a')::text || '/forged.png'), false, 'exports: admin B cannot upload under institution A''s folder (other tenant)');
select is(pg_temp.try_insert('a', 'institution_admin', 'exports', 'loose.png'), false, 'exports: admin A cannot upload outside any institution folder');
select is(pg_temp.try_insert('a', 'institution_admin', 'exports', 'not-a-uuid/x.png'), false, 'exports: admin A cannot upload under a folder that is not an institution id');
select is(pg_temp.try_update('a', 'institution_admin', 'exports', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 0, 'exports: institution_admin A cannot update their institution''s object');
select is(pg_temp.try_update('a', 'teacher', 'exports', tests.inst('a')::text || '/upd.png', tests.inst('a')::text || '/renamed.png'), 0, 'exports: teacher A cannot update their institution''s object');
select is(pg_temp.try_update('b', 'institution_admin', 'exports', tests.inst('a')::text || '/other-upd.png', tests.inst('b')::text || '/stolen.png'), 0, 'exports: admin B cannot update institution A''s object (other tenant)');
select is(pg_temp.try_update('a', 'institution_admin', 'exports', tests.inst('a')::text || '/mv.png', tests.inst('b')::text || '/moved.png'), 0, 'exports: admin A cannot move an object into institution B''s folder');
select is(pg_temp.try_delete('b', 'institution_admin', 'exports', tests.inst('a')::text || '/other-del.png'), 0, 'exports: admin B cannot delete institution A''s object (other tenant)');
select is(pg_temp.try_delete('a', 'teacher', 'exports', tests.inst('a')::text || '/teacher-del.png'), 0, 'exports: teacher A cannot delete');
select is(pg_temp.try_delete('a', 'institution_admin', 'exports', tests.inst('a')::text || '/del.png'), 0, 'exports: admin A cannot delete their institution''s object');

-- server code (service role) writes exports
select tests.act_as_service();
select lives_ok(format($q$insert into storage.objects (bucket_id, name) values ('exports', %L)$q$, tests.inst('a')::text || '/report.pdf'), 'the service role can write an export');
select tests.reset();

select * from finish();
rollback;
