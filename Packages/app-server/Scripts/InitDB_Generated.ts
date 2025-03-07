// intercepted methods
// ==========

import {Knex} from "knex";

function InterceptMethods(knex: Knex.Transaction) {
	const createTable_orig = knex.schema.createTable;
	//knex.schema.createTable = createTable_custom;
	knex.schema.constructor.prototype.createTable = createTable_custom;
	function createTable_custom(...args) {
		const [tableName] = args;
		//console.log("Intercepted:", tableName);
		knex["_createdTables"] = (knex["_createdTables"] ?? []);
		knex["_createdTables"].push(tableName);
		return createTable_orig.apply(this, args);
	}
	Object.defineProperty(knex.schema, "createTable", {value: createTable_custom});
}

// copied from mobx-graphlink (Decorators.ts)
// ==========

// todo: move as much of the code in this file as possible into mobx-graphlink (not sure of the ideal approach...)
declare module "knex" {
	namespace Knex {
		interface ColumnBuilder {
			DeferRef: (this: Knex.ColumnBuilder, opts?: DeferRef_Options)=>Knex.ColumnBuilder;
		}
	}
}
export type DeferRef_Options = {enforceAtTransactionEnd?: boolean};

// added methods
// ==========

const deferredReferences = [] as {fromTable: string, fromColumn: string, toTable: string, toColumn: string, enforceAtTransactionEnd: boolean}[];
//Object.prototype["DeferRefs"] = DeferRefs;
Object.defineProperties(Object.prototype, {
	DeferRef: {value: DeferRef},
});
function DeferRef(this: Knex.ColumnBuilder, opts?: DeferRef_Options): Knex.ColumnBuilder {
	//console.log("Test0:", this);
	const statements = this["_tableBuilder"]["_statements"] as any[];
	//console.log("Test1:", statements);

	const refInfo = statements.filter(a=>a.grouping == "alterTable" && a.method == "foreign").pop().args[0];
	const ref = {
		fromTable: this["_tableBuilder"]["_tableName"], fromColumn: refInfo.column,
		toTable: refInfo.inTable, toColumn: refInfo.references,
		enforceAtTransactionEnd: opts?.enforceAtTransactionEnd ?? false,
	};
	//console.log("Test2:", ref);

	statements.splice(statements.indexOf(refInfo), 1); // remove call that tries to set "references" flag; we're deferring to later
	deferredReferences.push(ref);

	return this;
}

// standalone functions
// ==========
const vPrefix = "v1_draft_";
function RemoveVPrefix(str: string) {
	return str.replace(vPrefix, "");
}

async function Start(knex: Knex.Transaction) {
	console.log("Starting");
	InterceptMethods(knex);

	//CreateDBIfNotExists("debate-map");
	// todo: add function-call to satify: "[this script should also automatically remove the entry for the latest migration from the `knex_migrations_lock` table, if it exists, so that you can keep rerunning it without blockage]"

	// create custom english dictionary, with all stop-words excluded; this makes searching a bit more powerful, by letting you include/exclude words like "the", "other", "might", "over", etc.
	await knex.raw(`
		create text search dictionary english_stem_nostop (
			Template = snowball,
			Language = english
		);

		create text search configuration public.english_nostop (COPY = pg_catalog.english);
		alter text search configuration public.english_nostop
			alter mapping for asciiword, asciihword, hword_asciipart, hword, hword_part, word with english_stem_nostop;
	`);

	return {v: vPrefix};
}
type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
async function End(knex: Knex.Transaction, info: ThenArg<ReturnType<typeof Start>>) {
	console.log("Added deferred foreign-key constraints to tables...");
	for (const ref of deferredReferences) {
		//const constraintName = `fk @from(${RemoveVPrefix(ref.fromTable)}.${ref.fromColumn}) @to(${RemoveVPrefix(ref.toTable)}.${ref.toColumn})`;
		const constraintName = `fk @from(${ref.fromColumn}) @to(${RemoveVPrefix(ref.toTable)}.${ref.toColumn})`;
		await knex.schema.raw(`
			alter table "${ref.fromTable}"
			add constraint "${constraintName}"
			foreign key ("${ref.fromColumn}") 
			references "${ref.toTable}" ("${ref.toColumn}")
			${ref.enforceAtTransactionEnd ? "deferrable initially deferred;" : "deferrable initially immediate;"}
		`);
		/*await knex.schema.raw(`
			ALTER TABLE "${ref.fromTable}"
			ADD FOREIGN KEY ("${ref.fromColumn}") 
			REFERENCES "${ref.toTable}" ("${ref.toColumn}");
		`);*/
	}

	const createdTableNames = knex["_createdTables"] ?? [];
	console.log("Activating new tables by renaming to:", createdTableNames.map(RemoveVPrefix));
	for (const tableName of createdTableNames) {
		await knex.schema.renameTable(tableName, RemoveVPrefix(tableName));
	}

	// set up indexes
	await knex.raw(`
		create index on "nodeRevisions"
		using gin (phrasing_tsvector);
	`);

	// set up app_user role for postgraphile connection, set up RLS, etc.
	await knex.raw(`
		do $$ begin
			create role app_user with nologin;
		end $$;
		grant connect on database "debate-map" to app_user;
		grant usage on schema app_public to app_user;
		--grant all on schema app_public to app_user;

		--alter default privileges in schema app_public grant select, insert, update, delete on tables to app_user;
		-- loop through all tables, granting permissions (the above doesn't work, because the "default permissions" are only used for future tables that are made)
		grant select, insert, update, delete on all tables in schema app_public to app_user;

		-- field collation fixes (ideal would be to, database-wide, have collation default to case-sensitive, but for now we just do it for a few key fields for which "ORDER BY" clauses exist)
		ALTER TABLE "nodeChildLinks" ALTER COLUMN "orderKey" SET DATA TYPE TEXT COLLATE "C"
		ALTER TABLE "nodeChildLinks" ALTER COLUMN "id" SET DATA TYPE TEXT COLLATE "C"

		-- indexes
		create index nodeChildLinks_parent_child on app_public."nodeChildLinks" (parent, child);

		-- helper functions (eg. optimized tree-traversal)
		CREATE OR REPLACE FUNCTION encode_uuid(id UUID) RETURNS varchar(22) LANGUAGE SQL IMMUTABLE AS $$1
			SELECT replace(replace(
			trim(trailing "=" FROM encode(decode(replace(gen_random_uuid()::text, "-", ""), "hex"), "base64"))
			, "+", "-"), "/", "_");
		$$;
		CREATE OR REPLACE FUNCTION decode_uuid(id text) RETURNS UUID LANGUAGE SQL IMMUTABLE AS $$
			SELECT encode(decode(
				replace(replace(id, "_", "/"), "-", "+") || substr("==", 1, (33-length(id)) % 3), "base64"), "hex")::uuid;
		$$;

		CREATE OR REPLACE FUNCTION descendants(root text, max_depth INTEGER DEFAULT 5)
		RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
			SELECT root as id, null as link_id, 0 as depth
			UNION ALL (
			WITH RECURSIVE children(id, depth, is_cycle, nodes_path, order_key, link_id) AS (
				SELECT
					p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
				FROM
					app_public."nodeChildLinks" AS p
				WHERE
					p.parent=root
				UNION
					SELECT
						c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
					FROM
						app_public."nodeChildLinks" AS c, children
					WHERE c.parent = children.id AND NOT is_cycle AND children.depth < max_depth
			) SELECT
				min(id) as id, link_id, min(depth) as depth
			FROM
				children
			 GROUP BY (link_id)
			 ORDER BY min(depth), min(order_key), link_id)
		$$;
		-- todo: update this
		CREATE OR REPLACE FUNCTION ancestors(root text, max_depth INTEGER DEFAULT 5)
		RETURNS TABLE(id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
			SELECT root as id, 0 as depth
			UNION ALL (
				WITH RECURSIVE parents(id, depth, is_cycle, nodes_path) AS (
					SELECT
						p.parent, 1, false, ARRAY[p.child]
					FROM
						app_public."nodeChildLinks" AS p
					WHERE
						p.child=root
					UNION
						SELECT
							c.parent, parents.depth+1, c.parent = ANY(parents.nodes_path), nodes_path || c.child
						FROM
							app_public."nodeChildLinks" AS c, parents
						WHERE c.child = parents.id AND NOT is_cycle AND parents.depth < max_depth
				) SELECT
					id, min(depth) as depth
				FROM
					parents
				GROUP BY id
				ORDER BY depth, id
			)
		$$;
		CREATE OR REPLACE FUNCTION shortest_path(source text, dest text)
		RETURNS TABLE(node_id text, link_id text) LANGUAGE plpgsql STABLE AS $$
		DECLARE
			node_ids text[];
			link_ids text[];
				seq integer[];
		BEGIN
			WITH RECURSIVE parents(link, parent, child, depth, is_cycle, nodes_path, links_path) AS (
				SELECT
					p.id, p.parent, p.child, 0, false, ARRAY[p.child], ARRAY[p.id]
				FROM
					app_public."nodeChildLinks" AS p
				WHERE
					p.child=dest
				UNION
					SELECT
						c.id, c.parent, c.child, parents.depth+1, c.parent = ANY(nodes_path), nodes_path || c.child, links_path || c.id
					FROM
						app_public."nodeChildLinks" AS c, parents
					WHERE c.child = parents.parent AND NOT is_cycle
			) SELECT
				parents.nodes_path, parents.links_path INTO STRICT node_ids, link_ids
			FROM
				parents
			WHERE parents.parent = source
			ORDER BY depth DESC LIMIT 1;
				SELECT array_agg(gs.val order by gs.val) INTO STRICT seq from generate_series(0, array_length(node_ids, 1)) gs(val);
			RETURN QUERY SELECT t.node_id, t.link_id FROM unnest(node_ids || source, ARRAY[null]::text[] || link_ids, seq) AS t(node_id, link_id, depth) ORDER by t.depth DESC;
		END
		$$;

		-- variant of descendants that tries to order the results in a way that mimics the render-order in debate-map (ie. traverse down at each step doing: stable-sort by link-id, then stable-sort by order-key)
		CREATE OR REPLACE FUNCTION descendants2(root text, max_depth INTEGER DEFAULT 5)
		RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
			WITH sub AS (
			SELECT null as parent_id, root as child_id, 0 as depth, null as order_key, null as link_id
			UNION ALL (
			WITH RECURSIVE children(parent_id, child_id, depth, is_cycle, nodes_path, order_key, link_id) AS (
				SELECT
					p.parent, p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
				FROM
					app_public."nodeChildLinks" AS p
				WHERE
					p.parent=root
				UNION
					SELECT
						c.parent, c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
					FROM
						app_public."nodeChildLinks" AS c, children
					WHERE c.parent = children.child_id AND NOT is_cycle AND children.depth < max_depth
			) SELECT DISTINCT ON (link_id) parent_id, child_id, depth, order_key, link_id
			FROM
				children
			ORDER BY link_id, depth))
			SELECT child_id as id, link_id, depth FROM sub ORDER BY sub.depth, sub.parent_id, sub.order_key, sub.link_id
		$$;

		-- RLS helper functions

		create or replace function IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(entry_creator varchar, policyID varchar, policyField varchar) returns boolean as $$ begin 
			return (
				current_setting('app.current_user_id') = entry_creator
				or current_setting('app.current_user_admin') = 'true'
				/*or (
					policyFields[0] -> policyField -> 'access' = 'true'
					or policyFields[1] -> current_setting('app.current_user_id') -> policyField -> 'access' = 'true'
				)*/
				or exists (
					select 1 from app_public."accessPolicies" where id = policyID and (
						(
							"permissions" -> policyField -> 'access' = 'true'
							-- the coalesce is needed to handle the case where the deep-field at that path doesn't exist, apparently
							and coalesce("permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access', 'null'::jsonb) != 'false'
						)
						or "permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access' = 'true'
					)
				)
			);
		end $$ language plpgsql;

		create or replace function CanCurrentUserAccessAllNodesInArray(nodes varchar[]) returns boolean as $$
		declare
			node varchar;
		begin 
			foreach node in array nodes loop
				if not IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = node), 'nodes') then
					return false;
				end if;
			end loop;
			return true;
		end $$ language plpgsql;






		-- search-related indexes/functions

		CREATE OR REPLACE FUNCTION pick_phrasing(base TEXT, question TEXT) RETURNS TEXT AS $$
			SELECT (CASE
				WHEN base IS NOT NULL AND length(base) > 0 AND regexp_match(base, '\[Paragraph [0-9]\]') IS NULL THEN base
				WHEN question IS NOT NULL AND length(question) > 0 AND regexp_match(question, '\[Paragraph [0-9]\]') IS NULL THEN question 
				ELSE ''
				END)
		$$ LANGUAGE SQL IMMUTABLE;


		CREATE OR REPLACE FUNCTION phrasings_to_tsv(base TEXT, question TEXT) RETURNS tsvector AS $$
		SELECT to_tsvector('public.english_nostop'::regconfig, pick_phrasing(base, question));
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION pick_rev_phrasing(phrasing JSONB) RETURNS TEXT AS $$
			SELECT pick_phrasing((phrasing #> '{text_base}')::text, (phrasing #> '{text_question}')::text);
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION rev_phrasing_to_tsv(phrasing JSONB) RETURNS tsvector AS $$
			SELECT to_tsvector('public.english_nostop'::regconfig, pick_rev_phrasing(phrasing));
		$$ LANGUAGE SQL IMMUTABLE;


		CREATE OR REPLACE FUNCTION phrasing_row_to_tsv(p app_public."nodePhrasings") RETURNS tsvector AS $$
			SELECT phrasings_to_tsv(p.text_base, p.text_question)
		$$ LANGUAGE SQL STABLE;


		CREATE OR REPLACE FUNCTION rev_row_phrasing_to_tsv(p app_public."nodeRevisions") RETURNS tsvector AS $$
			SELECT rev_phrasing_to_tsv(p.phrasing)
		$$ LANGUAGE SQL STABLE;

		CREATE OR REPLACE FUNCTION attachment_quotes_table(attachments JSONB) RETURNS TABLE (quote TEXT) AS $$
			SELECT jsonb_array_elements_text(jsonb_path_query_array(attachments,'$[*].quote.content')) AS quote;
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION attachment_quotes(attachments JSONB) RETURNS TEXT AS $$
			SELECT string_agg(t, '\n\n') FROM attachment_quotes_table(attachments) AS t;
		$$ LANGUAGE SQL IMMUTABLE;


		CREATE OR REPLACE FUNCTION attachments_to_tsv(attachments JSONB) RETURNS tsvector AS $$
			SELECT jsonb_to_tsvector('public.english_nostop'::regconfig, jsonb_path_query_array(attachments,'$[*].quote.content'), '["string"]');
		$$ LANGUAGE SQL IMMUTABLE;

		CREATE OR REPLACE FUNCTION rev_row_quote_to_tsv(r app_public."nodeRevisions") RETURNS tsvector AS $$
			SELECT attachments_to_tsv(r.attachments);
		$$ LANGUAGE SQL STABLE;

		CREATE INDEX node_phrasings_text_en_idx on app_public."nodePhrasings" using gin (phrasings_to_tsv(text_base, text_question));
		CREATE INDEX node_revisions_phrasing_en_idx on app_public."nodeRevisions" using gin(rev_phrasing_to_tsv(phrasing));
		CREATE INDEX node_revisions_quotes_en_idx ON app_public."nodeRevisions" using gin(attachments_to_tsv(attachments));

		CREATE OR REPLACE FUNCTION local_search(
			root text, query text,
			slimit INTEGER DEFAULT 20, soffset INTEGER DEFAULT 0, depth INTEGER DEFAULT 10,
			quote_rank_factor FLOAT DEFAULT 0.9, alt_phrasing_rank_factor FLOAT default 0.95
		) RETURNS TABLE (node_id TEXT, rank FLOAT, type TEXT, found_text TEXT, node_text TEXT) AS $$
		  WITH d AS (SELECT id FROM descendants2(root, depth)),
				 lrev AS (SELECT DISTINCT ON (node) node, id FROM app_public."nodeRevisions" ORDER BY node, "createdAt" DESC),
				 p AS (
						SELECT rev.node AS node_id,
							ts_rank(rev_phrasing_to_tsv(rev.phrasing), websearch_to_tsquery('public.english_nostop'::regconfig, query)) AS rank,
							'standard' AS type,
							ts_headline('public.english_nostop'::regconfig, pick_rev_phrasing(rev.phrasing), websearch_to_tsquery('public.english_nostop'::regconfig, query)) as found_text
							FROM app_public."nodeRevisions" rev
							JOIN lrev USING (id)
							JOIN d ON rev.node = d.id
							WHERE websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ rev_phrasing_to_tsv(rev.phrasing)
					 UNION (
						SELECT rev.node AS node_id,
							ts_rank(attachments_to_tsv(rev.attachments), websearch_to_tsquery('public.english_nostop'::regconfig, query)) * quote_rank_factor AS rank,
							'quote' AS type,
							ts_headline('public.english_nostop'::regconfig, attachment_quotes(rev.attachments), websearch_to_tsquery('public.english_nostop'::regconfig, query)) as found_text
							FROM app_public."nodeRevisions" rev
							JOIN lrev USING (id)
							JOIN d ON rev.node = d.id
							WHERE websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ attachments_to_tsv(rev.attachments)
					) UNION (
						SELECT phrasing.node AS node_id,
							ts_rank(phrasing_row_to_tsv(phrasing), websearch_to_tsquery('public.english_nostop'::regconfig, query)) * alt_phrasing_rank_factor AS rank,
							phrasing.type AS type,
							ts_headline('public.english_nostop'::regconfig, pick_phrasing(text_base, text_question), websearch_to_tsquery('public.english_nostop'::regconfig, query)) AS found_text
							FROM app_public."nodePhrasings" AS phrasing
							JOIN d ON phrasing.node = d.id
							WHERE websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ phrasing_row_to_tsv(phrasing)
					)
				 ),
				 op AS (SELECT DISTINCT ON (node_id) node_id, rank, type, found_text FROM p ORDER BY node_id, rank DESC),
				 op2 AS (
					SELECT op.*, pick_rev_phrasing(rev.phrasing) AS node_text
				  FROM op
					JOIN lrev ON (op.node_id = lrev.node)
					JOIN app_public."nodeRevisions" AS rev USING (id))
		  SELECT * FROM op2 ORDER BY rank DESC LIMIT slimit OFFSET soffset;
		$$ LANGUAGE SQL STABLE;

    













		

		-- simple RLS policies (where to access, it must be that: user is creator, user is admin, entry's policy allows general access [without user-specific block], or entry's policy has user-specific grant)

		alter table app_public."terms" enable row level security;
		do $$ begin
			drop policy if exists "terms_rls" on app_public."terms";
			create policy "terms_rls" on app_public."terms" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'terms'));
		end $$;

		alter table app_public."medias" enable row level security;
		do $$ begin
			drop policy if exists "medias_rls" on app_public."medias";
			create policy "medias_rls" on app_public."medias" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'medias'));
		end $$;

		alter table app_public."maps" enable row level security;
		do $$ begin
			drop policy if exists "maps_rls" on app_public."maps";
			create policy "maps_rls" on app_public."maps" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'maps'));
		end $$;

		alter table app_public."nodes" enable row level security;
		do $$ begin
			drop policy if exists "nodes_rls" on app_public."nodes";
			create policy "nodes_rls" on app_public."nodes" as permissive for all using (IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'nodes'));
		end $$;

		-- derivative RLS policies (where to access an entry, the RLS policies of its associated objects must all pass)

		alter table app_public."mapNodeEdits" enable row level security;
		do $$ begin
			drop policy if exists "mapNodeEdits_rls" on app_public."mapNodeEdits";
			create policy "mapNodeEdits_rls" on app_public."mapNodeEdits" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.maps where id = "map"), 'maps')
				and IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeChildLinks" enable row level security;
		do $$ begin
			drop policy if exists "nodeChildLinks_rls" on app_public."nodeChildLinks";
			create policy "nodeChildLinks_rls" on app_public."nodeChildLinks" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "parent"), 'nodes')
				and IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "child"), 'nodes')
			);
		end $$;

		alter table app_public."nodePhrasings" enable row level security;
		do $$ begin
			drop policy if exists "nodePhrasings_rls" on app_public."nodePhrasings";
			create policy "nodePhrasings_rls" on app_public."nodePhrasings" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeRatings" enable row level security;
		do $$ begin
			drop policy if exists "nodeRatings_rls" on app_public."nodeRatings";
			create policy "nodeRatings_rls" on app_public."nodeRatings" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess(creator, "accessPolicy", 'nodeRatings')
				and IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeRevisions" enable row level security;
		do $$ begin
			drop policy if exists "nodeRevisions_rls" on app_public."nodeRevisions";
			create policy "nodeRevisions_rls" on app_public."nodeRevisions" as permissive for all using (
				IsCurrentUserCreatorOrAdminOrPolicyAllowsAccess('n/a', (select "accessPolicy" from app_public.nodes where id = "node"), 'nodes')
			);
		end $$;

		alter table app_public."nodeTags" enable row level security;
		do $$ begin
			drop policy if exists "nodeTags_rls" on app_public."nodeTags";
			create policy "nodeTags_rls" on app_public."nodeTags" as permissive for all using (
				CanCurrentUserAccessAllNodesInArray("nodes")
			);
		end $$;

		-- unique RLS policies

		alter table app_public."userHiddens" enable row level security;
		do $$ begin
			drop policy if exists "userHiddens_rls" on app_public."userHiddens";
			create policy "userHiddens_rls" on app_public."userHiddens" as permissive for all using (id = current_setting('app.current_user_id'));
		end $$;

		alter table app_public."commandRuns" enable row level security;
		do $$ begin
			drop policy if exists "commandRuns_rls" on app_public."commandRuns";
			create policy "commandRuns_rls" on app_public."commandRuns" as permissive for all using (
				current_setting('app.current_user_admin') = 'true'
				or (
					-- public_base = true, iff the Command class has "canShowInStream" enabled, and the user has "addToStream" enabled (see CommandMacros/General.ts)
					public_base = true
					and (
						CanCurrentUserAccessAllNodesInArray(array(select jsonb_array_elements_text("rlsTargets" -> 'nodes')))
					)
				)
			);
		end $$;
	`);

	console.log("Done");
}

// migration script
// ==========

export async function up(knex: Knex.Transaction) {
	const info = await Start(knex);
	const {v} = info;

	// used by generated code
	function RunFieldInit(tableBuilder: Knex.TableBuilder, fieldName: string, fieldInitFunc: (t: Knex.TableBuilder, n: string)=>Knex.ColumnBuilder) {
		const methodsCalled = [] as string[];
		const methodCallInterceptor = new Proxy({}, {
			get(target, methodName: string) {
				methodsCalled.push(methodName);
				return ()=>methodCallInterceptor;
			},
		});
		// do one early call, with the "builder"/"chain" object being the method-call-interceptor; this way, we know what methods are called, ie. the field characteristics
		fieldInitFunc(methodCallInterceptor as any, fieldName);
		//const fieldMarkedNullable = fieldInitFunc.toString().includes(".nullable()");
		const fieldMarkedNullable = methodsCalled.includes("nullable");

		const chain = fieldInitFunc(tableBuilder, fieldName);
		// if field is not explicitly marked nullable, assume it is intended to be non-nullable (the safer default; and makes the default match that of TypeScript and the @Field decorator)
		if (!fieldMarkedNullable) {
			chain.notNullable();
		}
	}

	await knex.schema.createTable(`${v}accessPolicies`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "name", (t, n)=>t.text(n));
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "permissions", (t, n)=>t.jsonb(n));
		RunFieldInit(t, "permissions_userExtends", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}commandRuns`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "actor", (t, n)=>t.text(n).references("id").inTable(v + "users").DeferRef());
		RunFieldInit(t, "runTime", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "public_base", (t, n)=>t.boolean(n));
		RunFieldInit(t, "commandName", (t, n)=>t.text(n));
		RunFieldInit(t, "commandPayload", (t, n)=>t.jsonb(n));
		RunFieldInit(t, "returnData", (t, n)=>t.jsonb(n));
		RunFieldInit(t, "rlsTargets", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}globalData`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "extras", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}mapNodeEdits`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "map", (t, n)=>t.text(n).references("id").inTable(v + `maps`).DeferRef());
		RunFieldInit(t, "node", (t, n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "time", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "type", (t, n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}maps`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t, n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "name", (t, n)=>t.text(n));
		RunFieldInit(t, "note", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "noteInline", (t, n)=>t.boolean(n).nullable());
		RunFieldInit(t, "rootNode", (t, n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef({enforceAtTransactionEnd: true}));
		RunFieldInit(t, "defaultExpandDepth", (t, n)=>t.integer(n));
		RunFieldInit(t, "nodeAccessPolicy", (t, n)=>t.text(n).nullable().references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "featured", (t, n)=>t.boolean(n).nullable());
		RunFieldInit(t, "editors", (t, n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "edits", (t, n)=>t.integer(n));
		RunFieldInit(t, "editedAt", (t, n)=>t.bigInteger(n).nullable());
		RunFieldInit(t, "extras", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}medias`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t, n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "name", (t, n)=>t.text(n));
		RunFieldInit(t, "type", (t, n)=>t.text(n));
		RunFieldInit(t, "url", (t, n)=>t.text(n));
		RunFieldInit(t, "description", (t, n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}nodeChildLinks`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "parent", (t, n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "child", (t, n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "group", (t, n)=>t.text(n));
		RunFieldInit(t, "orderKey", (t, n)=>t.text(n));
		RunFieldInit(t, "form", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "seriesAnchor", (t, n)=>t.boolean(n).nullable());
		RunFieldInit(t, "seriesEnd", (t, n)=>t.boolean(n).nullable());
		RunFieldInit(t, "polarity", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "c_parentType", (t, n)=>t.text(n));
		RunFieldInit(t, "c_childType", (t, n)=>t.text(n));
	});

	await knex.schema.createTable(`${v}nodePhrasings`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "node", (t, n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "type", (t, n)=>t.text(n));
		RunFieldInit(t, "text_base", (t, n)=>t.text(n));
		RunFieldInit(t, "text_negation", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "text_question", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "note", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "terms", (t, n)=>t.specificType(n, "jsonb[]"));
		RunFieldInit(t, "references", (t, n)=>t.specificType(n, "text[]"));
	});

	await knex.schema.createTable(`${v}nodeRatings`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t, n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "node", (t, n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "type", (t, n)=>t.text(n));
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "value", (t, n)=>t.float(n));
	});

	await knex.schema.createTable(`${v}nodes`, t=>{
		
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "type", (t, n)=>t.text(n));
		RunFieldInit(t, "rootNodeForMap", (t, n)=>t.text(n).nullable().references("id").inTable(v + `maps`).DeferRef());
		RunFieldInit(t, "c_currentRevision", (t, n)=>t.text(n).references("id").inTable(v + `nodeRevisions`).DeferRef());
		RunFieldInit(t, "accessPolicy", (t, n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "multiPremiseArgument", (t, n)=>t.boolean(n).nullable());
		RunFieldInit(t, "argumentType", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "extras", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}nodeRevisions`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "node", (t, n)=>t.text(n).references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "phrasing", (t, n)=>t.jsonb(n));
		RunFieldInit(t, "phrasing_tsvector", (t, n)=>t.specificType(n, `tsvector generated always as (jsonb_to_tsvector('english_nostop', phrasing, '["string"]')) stored`).notNullable());
		RunFieldInit(t, "note", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "displayDetails", (t, n)=>t.jsonb(n).nullable());
		RunFieldInit(t, "attachments", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}nodeTags`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "nodes", (t, n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "labels", (t, n)=>t.jsonb(n).nullable());
		RunFieldInit(t, "mirrorChildrenFromXToY", (t, n)=>t.jsonb(n).nullable());
		RunFieldInit(t, "xIsExtendedByY", (t, n)=>t.jsonb(n).nullable());
		RunFieldInit(t, "mutuallyExclusiveGroup", (t, n)=>t.jsonb(n).nullable());
		RunFieldInit(t, "restrictMirroringOfX", (t, n)=>t.jsonb(n).nullable());
		RunFieldInit(t, "cloneHistory", (t, n)=>t.jsonb(n).nullable());
	});

	await knex.schema.createTable(`${v}shares`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "name", (t, n)=>t.text(n));
		RunFieldInit(t, "type", (t, n)=>t.text(n));
		RunFieldInit(t, "mapID", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "mapView", (t, n)=>t.jsonb(n).nullable());
	});

	await knex.schema.createTable(`${v}terms`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "accessPolicy", (t, n)=>t.text(n).references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "name", (t, n)=>t.text(n));
		RunFieldInit(t, "forms", (t, n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "disambiguation", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "type", (t, n)=>t.text(n));
		RunFieldInit(t, "definition", (t, n)=>t.text(n));
		RunFieldInit(t, "note", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "attachments", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}userHiddens`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "email", (t, n)=>t.text(n));
		RunFieldInit(t, "providerData", (t, n)=>t.jsonb(n));
		RunFieldInit(t, "backgroundID", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "backgroundCustom_enabled", (t, n)=>t.boolean(n).nullable());
		RunFieldInit(t, "backgroundCustom_color", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "backgroundCustom_url", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "backgroundCustom_position", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "addToStream", (t, n)=>t.boolean(n));
		RunFieldInit(t, "lastAccessPolicy", (t, n)=>t.string(n).nullable().references("id").inTable(v + `accessPolicies`).DeferRef());
		RunFieldInit(t, "extras", (t, n)=>t.jsonb(n));
	});

	await knex.schema.createTable(`${v}users`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "displayName", (t, n)=>t.text(n));
		RunFieldInit(t, "photoURL", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "joinDate", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "permissionGroups", (t, n)=>t.jsonb(n));
		RunFieldInit(t, "edits", (t, n)=>t.integer(n));
		RunFieldInit(t, "lastEditAt", (t, n)=>t.bigInteger(n).nullable());
	});

	await knex.schema.createTable(`${v}visibilityDirectives`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "actor", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "priority", (t, n)=>t.float(n));
		RunFieldInit(t, "context", (t, n)=>t.specificType(n, "text[]"));
		RunFieldInit(t, "target_map", (t, n)=>t.text(n).nullable().references("id").inTable(v + `maps`).DeferRef());
		RunFieldInit(t, "target_node", (t, n)=>t.text(n).nullable().references("id").inTable(v + `nodes`).DeferRef());
		RunFieldInit(t, "target_nodeChildLink", (t, n)=>t.text(n).nullable().references("id").inTable(v + `nodeChildLinks`).DeferRef());
		RunFieldInit(t, "visibility_self", (t, n)=>t.text(n).nullable());
		RunFieldInit(t, "visibility_nodes", (t, n)=>t.text(n).nullable());
	});

	await knex.schema.createTable(`${v}feedback_proposals`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "type", (t, n)=>t.text(n));
		RunFieldInit(t, "title", (t, n)=>t.text(n));
		RunFieldInit(t, "text", (t, n)=>t.text(n));
		RunFieldInit(t, "creator", (t, n)=>t.text(n).references("id").inTable(v + `users`).DeferRef());
		RunFieldInit(t, "createdAt", (t, n)=>t.bigInteger(n));
		RunFieldInit(t, "editedAt", (t, n)=>t.bigInteger(n).nullable());
		RunFieldInit(t, "completedAt", (t, n)=>t.bigInteger(n).nullable());
	});

	await knex.schema.createTable(`${v}feedback_userInfos`, t=>{
		RunFieldInit(t, "id", (t, n)=>t.text(n).primary());
		RunFieldInit(t, "proposalsOrder", (t, n)=>t.specificType(n, "text[]"));
	});

	await End(knex, info);
}
/*export function down() {
	throw new Error("Not implemented.");
}*/