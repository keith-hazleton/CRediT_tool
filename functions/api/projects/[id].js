// GET /api/projects/:id - Get a project by ID
export async function onRequestGet(context) {
  const { env, params } = context;
  const { id } = params;

  const row = await env.DB.prepare(
    "SELECT id, title, created_at FROM projects WHERE id = ?"
  ).bind(id).first();

  if (!row) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json(row);
}
