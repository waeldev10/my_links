// عناصر DOM
const searchInput = document.getElementById("searchInput");
const categoriesContainer = document.getElementById("categoriesContainer");
const linksContainer = document.getElementById("linksContainer");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");

// عناصر نموذج إضافة رابط
const addLinkForm = document.getElementById("addLinkForm");
const addTitleInput = document.getElementById("addTitleInput");
const addUrlInput = document.getElementById("addUrlInput");
const addCategoryInput = document.getElementById("addCategoryInput");
const addDescriptionInput = document.getElementById("addDescriptionInput");
const addTagsInput = document.getElementById("addTagsInput");

// عناصر Modal التعديل
const editModal = document.getElementById("editModal");
const editLinkForm = document.getElementById("editLinkForm");
const editTitleInput = document.getElementById("editTitleInput");
const editUrlInput = document.getElementById("editUrlInput");
const editCategoryInput = document.getElementById("editCategoryInput");
const editDescriptionInput = document.getElementById("editDescriptionInput");
const editTagsInput = document.getElementById("editTagsInput");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// عناصر Modal الحذف
const deleteModal = document.getElementById("deleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// عناصر Modal الرسائل
const messageModal = document.getElementById("messageModal");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const closeMessageModal = document.getElementById("closeMessageModal");

// عناصر رسائل الخطأ
const addTitleError = document.getElementById("addTitleError");
const addUrlError = document.getElementById("addUrlError");
const editTitleError = document.getElementById("editTitleError");
const editUrlError = document.getElementById("editUrlError");
const flashContainer = document.getElementById("flashContainer");

// متغيرات حالة
let currentEditId = null;
let currentDeleteId = null;

// ثوابت التحقق
const URL_REGEX = /^https?:\/\/.+\..+/i;

// الحالة الحالية للفلاتر
let state = {
  search: "",
  category: "الكل",
};

// حالة التحميل
let isDatabaseReady = false;
let allLinksCache = [];

// ========== التحقق من الحقول ==========
function isValidUrl(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  try {
    new URL(trimmed);
    return URL_REGEX.test(trimmed);
  } catch {
    return false;
  }
}

function showFieldError(errorEl, message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  errorEl.previousElementSibling?.classList.add("input-error");
}

function clearFieldError(errorEl) {
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
  errorEl.previousElementSibling?.classList.remove("input-error");
}

function clearAddFormErrors() {
  clearFieldError(addTitleError);
  addTitleInput?.classList.remove("input-error");
  clearFieldError(addUrlError);
  addUrlInput?.classList.remove("input-error");
}

function clearEditFormErrors() {
  clearFieldError(editTitleError);
  editTitleInput?.classList.remove("input-error");
  clearFieldError(editUrlError);
  editUrlInput?.classList.remove("input-error");
}

function validateAddForm() {
  clearAddFormErrors();
  let isValid = true;

  const title = (addTitleInput?.value || "").trim();
  const url = (addUrlInput?.value || "").trim();

  if (!title) {
    showFieldError(addTitleError, "الرجاء إدخال عنوان الموقع");
    isValid = false;
  }

  if (!url) {
    showFieldError(addUrlError, "الرجاء إدخال رابط الموقع");
    isValid = false;
  } else if (!isValidUrl(url)) {
    showFieldError(addUrlError, "الرجاء إدخال رابط صحيح يبدأ بـ http أو https");
    isValid = false;
  }

  return isValid;
}

function validateEditForm() {
  clearEditFormErrors();
  let isValid = true;

  const title = (editTitleInput?.value || "").trim();
  const url = (editUrlInput?.value || "").trim();

  if (!title) {
    showFieldError(editTitleError, "الرجاء إدخال عنوان الموقع");
    isValid = false;
  }

  if (!url) {
    showFieldError(editUrlError, "الرجاء إدخال رابط الموقع");
    isValid = false;
  } else if (!isValidUrl(url)) {
    showFieldError(editUrlError, "الرجاء إدخال رابط صحيح يبدأ بـ http أو https");
    isValid = false;
  }

  return isValid;
}

// إزالة رسائل الخطأ عند الكتابة
function setupValidationListeners() {
  [addTitleInput, addUrlInput].forEach((input) => {
    input?.addEventListener("input", () => {
      clearAddFormErrors();
    });
  });
  [editTitleInput, editUrlInput].forEach((input) => {
    input?.addEventListener("input", () => {
      clearEditFormErrors();
    });
  });
}

// ========== رسائل الفلاش ==========
function showFlashSuccess(message, duration = 3500) {
  if (!flashContainer) return;

  const toast = document.createElement("div");
  toast.className =
    "flash-toast flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800";
  toast.innerHTML = `
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
    </span>
    <span class="flex-1">${message}</span>
  `;

  flashContainer.appendChild(toast);

  const removeToast = () => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  };

  setTimeout(removeToast, duration);
}

// عرض رسالة في modal
function showMessage(title, text) {
  messageTitle.textContent = title;
  messageText.textContent = text;
  editModal.classList.add("hidden");
  deleteModal.classList.add("hidden");
  messageModal.classList.remove("hidden");
  messageModal.classList.add("flex");
}

// إغلاق جميع الـ modals
function closeAllModals() {
  editModal.classList.add("hidden");
  deleteModal.classList.add("hidden");
  messageModal.classList.add("hidden");
  editModal.classList.remove("flex");
  deleteModal.classList.remove("flex");
  messageModal.classList.remove("flex");
  currentEditId = null;
  currentDeleteId = null;
}

// تهيئة قاعدة البيانات
async function initDatabaseConnection() {
  try {
    await initDatabase();
    isDatabaseReady = true;
    await loadAllLinks();
  } catch (error) {
    console.error("فشل في تهيئة قاعدة البيانات:", error);
    showMessage(
      "خطأ في التحميل",
      "حدث خطأ في تحميل قاعدة البيانات. يرجى إعادة تحميل الصفحة."
    );
  }
}

// تحميل جميع الروابط
async function loadAllLinks() {
  try {
    allLinksCache = await getAllLinks();
  } catch (error) {
    console.error("خطأ في تحميل الروابط:", error);
    allLinksCache = [];
  }
}

// تجهيز قائمة التصنيفات من البيانات
async function getCategories() {
  try {
    const categories = await getAllCategories();
    return ["الكل", ...categories];
  } catch (error) {
    console.error("خطأ في قراءة التصنيفات:", error);
    return ["الكل"];
  }
}

function createCategoryChip(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className =
    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors " +
    "border-slate-200 bg-base-50 text-slate-600 " +
    "hover:bg-white hover:text-slate-900";

  if (label === state.category) {
    button.className =
      "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors " +
      "border-slate-800 bg-slate-900 text-white";
  }

  button.addEventListener("click", () => {
    state.category = label;
    renderCategories();
    renderLinks();
  });

  return button;
}

async function renderCategories() {
  const cats = await getCategories();
  categoriesContainer.innerHTML = "";
  cats.forEach((cat) => {
    categoriesContainer.appendChild(createCategoryChip(cat));
  });
}

// فلترة البيانات حسب البحث والتصنيف
async function filterLinks() {
  if (!isDatabaseReady) {
    return [];
  }

  try {
    const categoryFilter = state.category === "الكل" ? null : state.category;
    const searchTerm = state.search.trim() || null;
    
    const results = await searchLinks(searchTerm, categoryFilter);
    return results;
  } catch (error) {
    console.error("خطأ في البحث:", error);
    return [];
  }
}

function createLinkCard(item) {
  const card = document.createElement("article");
  card.dataset.id = String(item.id);
  card.className =
    "group flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 text-sm transition-colors hover:border-slate-900";

  const top = document.createElement("div");

  const titleRow = document.createElement("div");
  titleRow.className = "mb-1.5 flex items-center justify-between gap-2";

  const title = document.createElement("h2");
  title.className =
    "text-sm font-semibold tracking-tight text-slate-900 line-clamp-1";
  title.textContent = item.title;

  const category = document.createElement("span");
  category.className =
    "rounded-full border border-slate-200 bg-base-50 px-2 py-0.5 text-[10px] text-slate-600";
  category.textContent = item.category;

  titleRow.appendChild(title);
  titleRow.appendChild(category);

  const desc = document.createElement("p");
  desc.className = "text-xs leading-relaxed text-slate-600 line-clamp-3";
  desc.textContent = item.description;

  top.appendChild(titleRow);
  top.appendChild(desc);

  const bottom = document.createElement("div");
  bottom.className =
    "mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5";

  const tagsContainer = document.createElement("div");
  tagsContainer.className = "flex flex-wrap gap-1";
  (item.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    span.className =
      "rounded-full bg-accent-100 px-2 py-0.5 text-[10px] text-slate-700";
    span.textContent = tag;
    tagsContainer.appendChild(span);
  });

  const actions = document.createElement("div");
  actions.className = "flex items-center gap-2";

  const visitLink = document.createElement("a");
  visitLink.href = item.url;
  visitLink.target = "_blank";
  visitLink.rel = "noopener noreferrer";
  visitLink.className =
    "text-[11px] font-medium text-primary-600 underline-offset-4 group-hover:underline";
  visitLink.textContent = "زيارة الموقع";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.dataset.action = "edit-link";
  editBtn.className =
    "text-[10px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline";
  editBtn.textContent = "تعديل";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete-link";
  deleteBtn.className =
    "text-[10px] text-red-500 underline-offset-4 hover:text-red-600 hover:underline";
  deleteBtn.textContent = "حذف";

  actions.appendChild(visitLink);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  bottom.appendChild(tagsContainer);
  bottom.appendChild(actions);

  card.appendChild(top);
  card.appendChild(bottom);

  return card;
}

async function renderLinks() {
  const list = await filterLinks();
  linksContainer.innerHTML = "";

  if (!list.length) {
    emptyState.classList.remove("hidden");
    resultCount.textContent = "0 روابط";
    return;
  }

  emptyState.classList.add("hidden");

  list.forEach((item) => {
    linksContainer.appendChild(createLinkCard(item));
  });

  resultCount.textContent = `${list.length} رابط${list.length > 1 ? "ات" : ""}`;
}

// إضافة رابط جديد
async function handleAddLink(event) {
  event.preventDefault();

  if (!isDatabaseReady) {
    showMessage("تنبيه", "قاعدة البيانات غير جاهزة بعد. يرجى الانتظار...");
    return;
  }

  const title = (addTitleInput?.value || "").trim();
  const url = (addUrlInput?.value || "").trim();
  const category =
    (addCategoryInput?.value || "").trim() || "غير مصنّف";
  const description = (addDescriptionInput?.value || "").trim();
  const tagsRaw = (addTagsInput?.value || "").trim();

  if (!validateAddForm()) {
    return;
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  try {
    await createLink({
      title,
      description,
      url,
      category,
      tags,
    });

    if (addLinkForm) {
      addLinkForm.reset();
      clearAddFormErrors();
    }

    showFlashSuccess("تمت إضافة الرابط بنجاح");

    // إعادة تحميل البيانات وعرضها
    await loadAllLinks();
    state.category = "الكل";
    await renderCategories();
    await renderLinks();
  } catch (error) {
    console.error("خطأ في إضافة الرابط:", error);
    showMessage("خطأ", "حدث خطأ في إضافة الرابط. يرجى المحاولة مرة أخرى.");
  }
}

// فتح modal الحذف
function openDeleteModal(id) {
  currentDeleteId = id;
  editModal.classList.add("hidden");
  messageModal.classList.add("hidden");
  deleteModal.classList.remove("hidden");
  deleteModal.classList.add("flex");
}

// تأكيد حذف رابط
async function confirmDelete() {
  if (!currentDeleteId) return;

  if (!isDatabaseReady) {
    showMessage("تنبيه", "قاعدة البيانات غير جاهزة بعد. يرجى الانتظار...");
    closeAllModals();
    return;
  }

  try {
    await deleteLink(currentDeleteId);
    showFlashSuccess("تم حذف الرابط بنجاح");
    await loadAllLinks();
    await renderCategories();
    await renderLinks();
    closeAllModals();
  } catch (error) {
    console.error("خطأ في حذف الرابط:", error);
    showMessage("خطأ", "حدث خطأ في حذف الرابط. يرجى المحاولة مرة أخرى.");
  }
}

// حذف رابط
function handleDeleteLink(id) {
  openDeleteModal(id);
}

// فتح modal التعديل
async function openEditModal(id) {
  if (!isDatabaseReady) {
    showMessage("تنبيه", "قاعدة البيانات غير جاهزة بعد. يرجى الانتظار...");
    return;
  }

  try {
    const current = await getLinkById(id);
    if (!current) {
      showMessage("خطأ", "الرابط غير موجود");
      return;
    }

    currentEditId = id;
    clearEditFormErrors();
    editTitleInput.value = current.title;
    editUrlInput.value = current.url;
    editCategoryInput.value = current.category || "";
    editDescriptionInput.value = current.description || "";
    editTagsInput.value = (current.tags || []).join(", ");

    deleteModal.classList.add("hidden");
    messageModal.classList.add("hidden");
    editModal.classList.remove("hidden");
    editModal.classList.add("flex");
  } catch (error) {
    console.error("خطأ في تحميل بيانات الرابط:", error);
    showMessage("خطأ", "حدث خطأ في تحميل بيانات الرابط.");
  }
}

// حفظ التعديلات
async function handleEditSubmit(event) {
  event.preventDefault();

  if (!currentEditId) return;

  const title = (editTitleInput?.value || "").trim();
  const url = (editUrlInput?.value || "").trim();
  const category =
    (editCategoryInput?.value || "").trim() || "غير مصنّف";
  const description = (editDescriptionInput?.value || "").trim();
  const tagsRaw = (editTagsInput?.value || "").trim();

  if (!validateEditForm()) {
    return;
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  try {
    await updateLink(currentEditId, {
      title,
      url,
      category,
      description,
      tags,
    });

    showFlashSuccess("تم حفظ التعديلات بنجاح");
    await loadAllLinks();
    await renderCategories();
    await renderLinks();
    closeAllModals();
  } catch (error) {
    console.error("خطأ في تعديل الرابط:", error);
    showMessage("خطأ", "حدث خطأ في تعديل الرابط. يرجى المحاولة مرة أخرى.");
  }
}

// تعديل رابط
function handleEditLink(id) {
  openEditModal(id);
}

function handleLinksContainerClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  if (!action) return;

  const card = target.closest("article");
  if (!card) return;

  const id = Number(card.dataset.id);
  if (!id) return;

  if (action === "delete-link") {
    handleDeleteLink(id);
  } else if (action === "edit-link") {
    handleEditLink(id);
  }
}

// تهيئة الأحداث
function initEvents() {
  searchInput.addEventListener("input", async (e) => {
    state.search = e.target.value;
    await renderLinks();
  });

  resetFiltersBtn.addEventListener("click", async () => {
    state = { search: "", category: "الكل" };
    searchInput.value = "";
    await renderCategories();
    await renderLinks();
  });

  if (addLinkForm) {
    addLinkForm.addEventListener("submit", handleAddLink);
  }

  linksContainer.addEventListener("click", handleLinksContainerClick);

  // أحداث Modal التعديل
  if (editLinkForm) {
    editLinkForm.addEventListener("submit", handleEditSubmit);
  }

  setupValidationListeners();
  if (closeEditModal) {
    closeEditModal.addEventListener("click", closeAllModals);
  }
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", closeAllModals);
  }

  // أحداث Modal الحذف
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", closeAllModals);
  }
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", confirmDelete);
  }

  // أحداث Modal الرسائل
  if (closeMessageModal) {
    closeMessageModal.addEventListener("click", closeAllModals);
  }

  // إغلاق عند الضغط على الخلفية
  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) {
        closeAllModals();
      }
    });
  }
  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) {
        closeAllModals();
      }
    });
  }
  if (messageModal) {
    messageModal.addEventListener("click", (e) => {
      if (e.target === messageModal) {
        closeAllModals();
      }
    });
  }

  // إغلاق عند الضغط على ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
    }
  });
}

// بدء التطبيق
async function init() {
  try {
    // تهيئة قاعدة البيانات أولاً
    await initDatabaseConnection();
    
    // ثم تهيئة الواجهة
    await renderCategories();
    await renderLinks();
    initEvents();
  } catch (error) {
    console.error("خطأ في تهيئة التطبيق:", error);
    showMessage(
      "خطأ في التحميل",
      "حدث خطأ في تحميل التطبيق. يرجى إعادة تحميل الصفحة."
    );
  }
}

document.addEventListener("DOMContentLoaded", init);
