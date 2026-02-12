// GET  /api/projects/:id/authors - List authors
// POST /api/projects/:id/authors - Add an author

export async function onRequestGet(context) {
  const { env, params } = context;
  const projectId = params.id;

  const { results } = await env.DB.prepare(
    "SELECT id, first_name, last_name, middle_initial, affiliations, roles, orcid, author_order FROM authors WHERE project_id = ? ORDER BY author_order ASC"
  ).bind(projectId).all();

  const authors = results.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleInitial: row.middle_initial,
    affiliations: JSON.parse(row.affiliations),
    roles: JSON.parse(row.roles),
    orcid: row.orcid,
    author_order: row.author_order
  }));

  return Response.json(authors);
}

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const projectId = params.id;
  const { firstName, lastName, middleInitial, affiliations, roles, orcid } = await request.json();

  if (!firstName || !lastName || !roles || roles.length === 0) {
    return Response.json({ error: "First name, last name, and at least one role are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  // Get the next order value
  const maxRow = await env.DB.prepare(
    "SELECT COALESCE(MAX(author_order), -1) as max_order FROM authors WHERE project_id = ?"
  ).bind(projectId).first();
  const nextOrder = (maxRow.max_order ?? -1) + 1;

  const name = [firstName, middleInitial, lastName].filter(Boolean).join(" ");

  await env.DB.prepare(
    "INSERT INTO authors (id, project_id, name, first_name, last_name, middle_initial, affiliations, roles, orcid, author_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    projectId,
    name,
    firstName,
    lastName,
    middleInitial || "",
    JSON.stringify(affiliations || []),
    JSON.stringify(roles),
    orcid || "",
    nextOrder
  ).run();

  return Response.json({
    id, firstName, lastName, middleInitial: middleInitial || "",
    affiliations: affiliations || [], roles, orcid: orcid || "", author_order: nextOrder
  }, { status: 201 });
}
