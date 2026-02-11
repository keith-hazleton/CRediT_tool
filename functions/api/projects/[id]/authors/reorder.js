// POST /api/projects/:id/authors/reorder - Swap two adjacent authors
// Body: { authorId: string, direction: -1 | 1 }

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const projectId = params.id;
  const { authorId, direction } = await request.json();

  if (!authorId || (direction !== -1 && direction !== 1)) {
    return Response.json({ error: "authorId and direction (-1 or 1) are required" }, { status: 400 });
  }

  // Get all authors ordered
  const { results } = await env.DB.prepare(
    "SELECT id, author_order FROM authors WHERE project_id = ? ORDER BY author_order ASC"
  ).bind(projectId).all();

  const idx = results.findIndex((a) => a.id === authorId);
  if (idx === -1) {
    return Response.json({ error: "Author not found" }, { status: 404 });
  }

  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= results.length) {
    return Response.json({ error: "Cannot move further" }, { status: 400 });
  }

  const a = results[idx];
  const b = results[swapIdx];

  // Swap order values
  const batch = [
    env.DB.prepare("UPDATE authors SET author_order = ? WHERE id = ?").bind(b.author_order, a.id),
    env.DB.prepare("UPDATE authors SET author_order = ? WHERE id = ?").bind(a.author_order, b.id)
  ];
  await env.DB.batch(batch);

  return Response.json({ ok: true });
}
