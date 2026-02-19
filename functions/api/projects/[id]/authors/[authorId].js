// PUT    /api/projects/:id/authors/:authorId - Update an author
// DELETE /api/projects/:id/authors/:authorId - Delete an author
import { normalizeAffiliations } from "../../../../_countries.js";

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { authorId } = params;
  const body = await request.json();
  const { firstName, lastName, middleInitial, affiliations, roles, orcid } = body;
  const equalContribution = ["first", "last"].includes(body.equalContribution) ? body.equalContribution : "";

  if (!firstName || !lastName || !roles || roles.length === 0) {
    return Response.json({ error: "First name, last name, and at least one role are required" }, { status: 400 });
  }

  const name = [firstName, middleInitial, lastName].filter(Boolean).join(" ");

  await env.DB.prepare(
    "UPDATE authors SET name = ?, first_name = ?, last_name = ?, middle_initial = ?, affiliations = ?, roles = ?, orcid = ?, equal_contribution = ? WHERE id = ?"
  ).bind(
    name,
    firstName,
    lastName,
    middleInitial || "",
    JSON.stringify(normalizeAffiliations(affiliations || [])),
    JSON.stringify(roles),
    orcid || "",
    equalContribution,
    authorId
  ).run();

  return Response.json({
    id: authorId, firstName, lastName, middleInitial: middleInitial || "",
    affiliations: normalizeAffiliations(affiliations || []), roles, orcid: orcid || "", equalContribution
  });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const { authorId } = params;

  await env.DB.prepare(
    "DELETE FROM authors WHERE id = ?"
  ).bind(authorId).run();

  return Response.json({ ok: true });
}
