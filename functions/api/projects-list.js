// GET /api/projects-list - List all projects with author counts
export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(`
    SELECT p.id, p.title, p.created_at,
           COUNT(a.id) as author_count
    FROM projects p
    LEFT JOIN authors a ON a.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();

  return Response.json(results);
}
