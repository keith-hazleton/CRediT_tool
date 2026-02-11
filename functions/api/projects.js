// POST /api/projects - Create a new project
export async function onRequestPost(context) {
  const { request, env } = context;
  const { title } = await request.json();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO projects (id, title) VALUES (?, ?)"
  ).bind(id, title || "Untitled Project").run();

  return Response.json({ id, title: title || "Untitled Project" }, { status: 201 });
}
