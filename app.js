// ===== CRediT Roles (NISO Z39.104-2022) =====
const CREDIT_ROLES = [
  { name: "Conceptualization", description: "Ideas; formulation or evolution of overarching research goals and aims." },
  { name: "Data curation", description: "Management activities to annotate (produce metadata), scrub data and maintain research data for initial use and later re-use." },
  { name: "Formal analysis", description: "Application of statistical, mathematical, computational, or other formal techniques to analyze or synthesize study data." },
  { name: "Funding acquisition", description: "Acquisition of the financial support for the project leading to this publication." },
  { name: "Investigation", description: "Conducting a research and investigation process, specifically performing the experiments, or data/evidence collection." },
  { name: "Methodology", description: "Development or design of methodology; creation of models." },
  { name: "Project administration", description: "Management and coordination responsibility for the research activity planning and execution." },
  { name: "Resources", description: "Provision of study materials, reagents, materials, patients, laboratory samples, animals, instrumentation, computing resources, or other analysis tools." },
  { name: "Software", description: "Programming, software development; designing computer programs; implementation of the computer code and supporting algorithms; testing of existing code components." },
  { name: "Supervision", description: "Oversight and leadership responsibility for the research activity planning and execution, including mentorship external to the core team." },
  { name: "Validation", description: "Verification of the overall replication/reproducibility of results/experiments and other research outputs." },
  { name: "Visualization", description: "Preparation, creation and/or presentation of the published work, specifically visualization/data presentation." },
  { name: "Writing \u2013 original draft", description: "Preparation, creation and/or presentation of the published work, specifically writing the initial draft." },
  { name: "Writing \u2013 review & editing", description: "Critical review, commentary or revision of the published work, including pre- or post-publication stages." }
];

// Unicode superscript digits for affiliation numbering
const SUPERSCRIPTS = ["\u2070", "\u00B9", "\u00B2", "\u00B3", "\u2074", "\u2075", "\u2076", "\u2077", "\u2078", "\u2079"];

// ===== State =====
let currentProjectId = null;
let authors = []; // Array of { id, name, affiliations, roles, author_order }
let pollInterval = null;
const POLL_MS = 5000; // Poll every 5 seconds

// ===== API Helper =====
async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

// ===== DOM Elements =====
const landingSection = document.getElementById("landing-section");
const projectSection = document.getElementById("project-section");
const projectTitleEl = document.getElementById("project-title");
const projectTitleInput = document.getElementById("project-title-input");
const createProjectBtn = document.getElementById("create-project-btn");
const shareLinkInput = document.getElementById("share-link");
const copyLinkBtn = document.getElementById("copy-link-btn");
const authorsList = document.getElementById("authors-list");
const addAuthorBtn = document.getElementById("add-author-btn");
const authorListOutput = document.getElementById("author-list-output");
const creditStatementOutput = document.getElementById("credit-statement-output");
const copyRichCreditBtn = document.getElementById("copy-rich-credit-btn");

// Modal
const authorModal = document.getElementById("author-modal");
const modalTitle = document.getElementById("modal-title");
const firstNameInput = document.getElementById("author-first-name");
const middleInitialInput = document.getElementById("author-middle-initial");
const lastNameInput = document.getElementById("author-last-name");
const affiliationsContainer = document.getElementById("affiliations-container");
const addAffiliationBtn = document.getElementById("add-affiliation-btn");
const rolesGrid = document.getElementById("roles-grid");
const modalSaveBtn = document.getElementById("modal-save-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalDeleteBtn = document.getElementById("modal-delete-btn");

let editingAuthorId = null; // null = adding new, string = editing existing

// ===== Initialize =====
function init() {
  buildRolesGrid();
  bindEvents();

  // Check URL for project param
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project");
  if (projectId) {
    loadProject(projectId);
  }
}

// ===== Roles Grid =====
function buildRolesGrid() {
  rolesGrid.innerHTML = "";
  CREDIT_ROLES.forEach((role) => {
    const item = document.createElement("label");
    item.className = "role-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = role.name;

    const textWrapper = document.createElement("span");
    const label = document.createElement("span");
    label.className = "role-label";
    label.textContent = role.name;
    const tooltip = document.createElement("span");
    tooltip.className = "role-tooltip";
    tooltip.textContent = role.description;
    textWrapper.appendChild(label);
    textWrapper.appendChild(tooltip);

    item.appendChild(checkbox);
    item.appendChild(textWrapper);
    rolesGrid.appendChild(item);
  });
}

// ===== Event Bindings =====
function bindEvents() {
  createProjectBtn.addEventListener("click", createProject);
  copyLinkBtn.addEventListener("click", () => copyToClipboard(shareLinkInput.value, copyLinkBtn));
  addAuthorBtn.addEventListener("click", () => openModal());
  addAffiliationBtn.addEventListener("click", addAffiliationRow);
  modalSaveBtn.addEventListener("click", saveAuthor);
  modalCancelBtn.addEventListener("click", closeModal);
  modalDeleteBtn.addEventListener("click", deleteAuthor);

  // Copy output buttons
  document.querySelectorAll(".copy-output-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      copyToClipboard(target.textContent, btn);
    });
  });

  // Rich text copy for CRediT statement
  copyRichCreditBtn.addEventListener("click", copyRichCreditStatement);

  // Close modal on overlay click
  authorModal.addEventListener("click", (e) => {
    if (e.target === authorModal) closeModal();
  });

  // Close modal on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !authorModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // Pause polling when tab is hidden, resume when visible
  document.addEventListener("visibilitychange", () => {
    if (currentProjectId) {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        fetchAuthors(); // Immediate refresh on return
      }
    }
  });
}

// ===== Project Creation =====
async function createProject() {
  const title = projectTitleInput.value.trim() || "Untitled Project";
  createProjectBtn.disabled = true;
  createProjectBtn.textContent = "Creating...";

  try {
    const data = await api("/projects", {
      method: "POST",
      body: JSON.stringify({ title })
    });

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set("project", data.id);
    window.history.pushState({}, "", url);

    loadProject(data.id);
  } catch (err) {
    console.error("Error creating project:", err);
    alert("Failed to create project. Please try again.");
    createProjectBtn.disabled = false;
    createProjectBtn.textContent = "Create New Project";
  }
}

// ===== Load Project =====
async function loadProject(projectId) {
  currentProjectId = projectId;

  try {
    const data = await api("/projects/" + projectId);
    projectTitleEl.textContent = data.title || "Untitled Project";

    // Show project section, hide landing
    landingSection.classList.add("hidden");
    projectSection.classList.remove("hidden");

    // Set shareable link
    const url = new URL(window.location);
    url.searchParams.set("project", projectId);
    shareLinkInput.value = url.toString();

    // Fetch authors and start polling
    await fetchAuthors();
    startPolling();
  } catch (err) {
    console.error("Error loading project:", err);
    alert("Project not found or failed to load. The link may be invalid.");
  }
}

// ===== Polling =====
function startPolling() {
  stopPolling();
  pollInterval = setInterval(fetchAuthors, POLL_MS);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// ===== Fetch Authors =====
async function fetchAuthors() {
  if (!currentProjectId) return;
  try {
    const data = await api("/projects/" + currentProjectId + "/authors");
    authors = data;
    renderAuthors();
    renderOutput();
  } catch (err) {
    console.error("Error fetching authors:", err);
  }
}

// ===== Render Authors =====
function renderAuthors() {
  if (authors.length === 0) {
    authorsList.innerHTML = '<p class="placeholder-text">No authors yet. Click "+ Add Myself" to get started.</p>';
    return;
  }

  authorsList.innerHTML = "";
  authors.forEach((author, index) => {
    const card = document.createElement("div");
    card.className = "author-card";

    // Reorder buttons
    const reorderDiv = document.createElement("div");
    reorderDiv.className = "reorder-btns";
    const upBtn = document.createElement("button");
    upBtn.textContent = "\u25B2";
    upBtn.title = "Move up";
    upBtn.disabled = index === 0;
    upBtn.addEventListener("click", () => moveAuthor(author.id, -1));
    const downBtn = document.createElement("button");
    downBtn.textContent = "\u25BC";
    downBtn.title = "Move down";
    downBtn.disabled = index === authors.length - 1;
    downBtn.addEventListener("click", () => moveAuthor(author.id, 1));
    reorderDiv.appendChild(upBtn);
    reorderDiv.appendChild(downBtn);

    // Author info
    const infoDiv = document.createElement("div");
    infoDiv.className = "author-info";

    const nameEl = document.createElement("div");
    nameEl.className = "author-name";
    nameEl.textContent = formatDisplayName(author);

    const affiliations = author.affiliations || [];
    const affEl = document.createElement("div");
    affEl.className = "author-affiliations";
    affEl.textContent = affiliations.map(formatAffiliation).join("; ");

    const roles = author.roles || [];
    const rolesEl = document.createElement("div");
    rolesEl.className = "author-roles";
    rolesEl.innerHTML = "Roles: <span>" + escapeHtml(roles.join(", ")) + "</span>";

    infoDiv.appendChild(nameEl);
    infoDiv.appendChild(affEl);
    infoDiv.appendChild(rolesEl);

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openModal(author));

    card.appendChild(reorderDiv);
    card.appendChild(infoDiv);
    card.appendChild(editBtn);
    authorsList.appendChild(card);
  });
}

// ===== Author Reordering =====
async function moveAuthor(authorId, direction) {
  try {
    await api("/projects/" + currentProjectId + "/authors/reorder", {
      method: "POST",
      body: JSON.stringify({ authorId, direction })
    });
    await fetchAuthors();
  } catch (err) {
    console.error("Error reordering:", err);
  }
}

// ===== Name Helpers =====
function formatDisplayName(author) {
  let name = author.firstName;
  if (author.middleInitial) name += " " + author.middleInitial;
  name += " " + author.lastName;
  return name;
}

function formatAffiliation(aff) {
  if (typeof aff === "string") return aff; // legacy fallback
  const parts = [aff.institution, aff.city, aff.state, aff.postalCode, aff.country].filter(Boolean);
  // Combine state + postal code on same segment if both exist
  const segments = [];
  if (aff.institution) segments.push(aff.institution);
  if (aff.city) segments.push(aff.city);
  const statePostal = [aff.state, aff.postalCode].filter(Boolean).join(" ");
  if (statePostal) segments.push(statePostal);
  if (aff.country) segments.push(aff.country);
  return segments.join(", ");
}

// ===== Modal =====
function openModal(author = null) {
  editingAuthorId = author ? author.id : null;
  modalTitle.textContent = author ? "Edit Author" : "Add Author";
  modalDeleteBtn.classList.toggle("hidden", !author);

  // Fill name fields
  firstNameInput.value = author ? author.firstName : "";
  middleInitialInput.value = author ? author.middleInitial : "";
  lastNameInput.value = author ? author.lastName : "";

  // Affiliations
  affiliationsContainer.innerHTML = "";
  const affs = author && author.affiliations && author.affiliations.length > 0
    ? author.affiliations
    : [{ institution: "", city: "", state: "", postalCode: "", country: "" }];
  affs.forEach((aff) => addAffiliationGroupWithValue(aff));
  updateRemoveButtons();

  // Roles
  rolesGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = author ? (author.roles || []).includes(cb.value) : false;
  });

  authorModal.classList.remove("hidden");
  firstNameInput.focus();
}

function closeModal() {
  authorModal.classList.add("hidden");
  editingAuthorId = null;
}

function addAffiliationRow() {
  addAffiliationGroupWithValue({ institution: "", city: "", state: "", postalCode: "", country: "" });
  updateRemoveButtons();
  const groups = affiliationsContainer.querySelectorAll(".affiliation-group");
  groups[groups.length - 1].querySelector(".aff-institution").focus();
}

function addAffiliationGroupWithValue(aff) {
  // Normalize legacy string affiliations
  if (typeof aff === "string") {
    aff = { institution: aff, city: "", state: "", postalCode: "", country: "" };
  }

  const group = document.createElement("div");
  group.className = "affiliation-group";

  const header = document.createElement("div");
  header.className = "affiliation-group-header";
  const label = document.createElement("span");
  const idx = affiliationsContainer.querySelectorAll(".affiliation-group").length + 1;
  label.textContent = "Affiliation " + idx;
  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-icon remove-affiliation-btn";
  removeBtn.title = "Remove";
  removeBtn.innerHTML = "&times;";
  removeBtn.addEventListener("click", () => {
    group.remove();
    renumberAffiliations();
    updateRemoveButtons();
  });
  header.appendChild(label);
  header.appendChild(removeBtn);

  const instInput = document.createElement("input");
  instInput.type = "text";
  instInput.className = "aff-institution";
  instInput.placeholder = "Institution / Department";
  instInput.value = aff.institution || "";

  const detailRow = document.createElement("div");
  detailRow.className = "affiliation-detail-row";

  const cityInput = document.createElement("input");
  cityInput.type = "text";
  cityInput.className = "aff-city";
  cityInput.placeholder = "City";
  cityInput.value = aff.city || "";

  const stateInput = document.createElement("input");
  stateInput.type = "text";
  stateInput.className = "aff-state";
  stateInput.placeholder = "State";
  stateInput.value = aff.state || "";

  const postalInput = document.createElement("input");
  postalInput.type = "text";
  postalInput.className = "aff-postal";
  postalInput.placeholder = "Postal Code";
  postalInput.value = aff.postalCode || "";

  const countryInput = document.createElement("input");
  countryInput.type = "text";
  countryInput.className = "aff-country";
  countryInput.placeholder = "Country";
  countryInput.value = aff.country || "";

  detailRow.appendChild(cityInput);
  detailRow.appendChild(stateInput);
  detailRow.appendChild(postalInput);
  detailRow.appendChild(countryInput);

  group.appendChild(header);
  group.appendChild(instInput);
  group.appendChild(detailRow);
  affiliationsContainer.appendChild(group);
}

function renumberAffiliations() {
  affiliationsContainer.querySelectorAll(".affiliation-group").forEach((group, i) => {
    group.querySelector(".affiliation-group-header span").textContent = "Affiliation " + (i + 1);
  });
}

function updateRemoveButtons() {
  const groups = affiliationsContainer.querySelectorAll(".affiliation-group");
  groups.forEach((group) => {
    const btn = group.querySelector(".remove-affiliation-btn");
    btn.style.visibility = groups.length <= 1 ? "hidden" : "visible";
  });
}

// ===== Save Author =====
async function saveAuthor() {
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const middleInitial = middleInitialInput.value.trim();

  if (!firstName || !lastName) {
    alert("Please enter a first and last name.");
    return;
  }

  const affiliations = [];
  affiliationsContainer.querySelectorAll(".affiliation-group").forEach((group) => {
    const institution = group.querySelector(".aff-institution").value.trim();
    const city = group.querySelector(".aff-city").value.trim();
    const state = group.querySelector(".aff-state").value.trim();
    const postalCode = group.querySelector(".aff-postal").value.trim();
    const country = group.querySelector(".aff-country").value.trim();
    if (institution || city || state || postalCode || country) {
      affiliations.push({ institution, city, state, postalCode, country });
    }
  });

  const roles = [];
  rolesGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
    roles.push(cb.value);
  });

  if (roles.length === 0) {
    alert("Please select at least one CRediT role.");
    return;
  }

  modalSaveBtn.disabled = true;
  modalSaveBtn.textContent = "Saving...";

  const payload = { firstName, lastName, middleInitial, affiliations, roles };

  try {
    if (editingAuthorId) {
      await api("/projects/" + currentProjectId + "/authors/" + editingAuthorId, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await api("/projects/" + currentProjectId + "/authors", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    closeModal();
    await fetchAuthors();
  } catch (err) {
    console.error("Error saving author:", err);
    alert("Failed to save. Please try again.");
  } finally {
    modalSaveBtn.disabled = false;
    modalSaveBtn.textContent = "Save";
  }
}

// ===== Delete Author =====
async function deleteAuthor() {
  if (!editingAuthorId) return;
  if (!confirm("Remove this author from the project?")) return;

  try {
    await api("/projects/" + currentProjectId + "/authors/" + editingAuthorId, {
      method: "DELETE"
    });
    closeModal();
    await fetchAuthors();
  } catch (err) {
    console.error("Error deleting author:", err);
    alert("Failed to delete. Please try again.");
  }
}

// ===== Output Generation =====
function renderOutput() {
  if (authors.length === 0) {
    authorListOutput.textContent = "";
    creditStatementOutput.textContent = "";
    return;
  }

  authorListOutput.textContent = generateAuthorList();
  creditStatementOutput.textContent = generateCreditStatement();
}

function toSuperscript(n) {
  return String(n).split("").map((d) => SUPERSCRIPTS[parseInt(d)]).join("");
}

function generateAuthorList() {
  // Collect all unique affiliations (by formatted string) in order of first appearance
  const affMap = new Map(); // formatted string -> index (1-based)
  authors.forEach((author) => {
    (author.affiliations || []).forEach((aff) => {
      const key = formatAffiliation(aff);
      if (key && !affMap.has(key)) {
        affMap.set(key, affMap.size + 1);
      }
    });
  });

  // Build author line
  const authorParts = authors.map((author) => {
    const displayName = formatDisplayName(author);
    const affs = (author.affiliations || []).map(formatAffiliation).filter((a) => a && affMap.has(a));
    if (affs.length === 0) return displayName;
    const superscripts = affs.map((a) => toSuperscript(affMap.get(a)));
    return displayName + superscripts.join("\u00B7");
  });

  let output = authorParts.join(", ");

  // Add affiliation footnotes
  if (affMap.size > 0) {
    output += "\n";
    affMap.forEach((index, aff) => {
      output += "\n" + toSuperscript(index) + " " + aff;
    });
  }

  return output;
}

function generateCreditStatement() {
  return authors.map((author) => {
    const roles = (author.roles || []).join(", ");
    return formatDisplayName(author) + ": " + roles + ".";
  }).join(" ");
}

// ===== Rich-Text Copy for CRediT Statement =====
async function copyRichCreditStatement() {
  const html = authors.map((author) => {
    const roles = (author.roles || []).join(", ");
    return "<b>" + escapeHtml(formatDisplayName(author)) + "</b>: " + escapeHtml(roles) + ".";
  }).join(" ");

  const plain = generateCreditStatement();

  try {
    const blob = new Blob([html], { type: "text/html" });
    const plainBlob = new Blob([plain], { type: "text/plain" });
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": blob,
        "text/plain": plainBlob
      })
    ]);
    flashCopied(copyRichCreditBtn);
  } catch (err) {
    // Fallback to plain text
    copyToClipboard(plain, copyRichCreditBtn);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== Clipboard Utility =====
async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    flashCopied(btn);
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    flashCopied(btn);
  }
}

function flashCopied(btn) {
  const original = btn.textContent;
  btn.textContent = "Copied!";
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("copied");
  }, 1500);
}

// ===== Start =====
init();
