// Общая шапка сайта + авторизация + "добавить материал" — вставляется на каждую страницу,
// чтобы не держать одну и ту же разметку в трёх копиях.

const SUPABASE_URL = "https://vvcxnqqyuvakrcmkmhjq.supabase.co";
const SUPABASE_KEY = "sb_publishable_SMTkWj9fHPpUG3e9arN3tg_knlaKKfp";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CONTACT_EMAIL = "post@khitrova.org";

const HEADER_HTML = `
<header class="site-nav">
  <nav class="links">
    <a href="index.html" data-page="index">Линия жизни</a>
    <a href="people.html" data-page="people">Люди</a>
    <a href="nasledie.html" data-page="nasledie">Наследие</a>
  </nav>
  <button class="burger-btn" id="burgerBtn" aria-label="Меню">☰</button>
  <div class="nav-right">
    <div class="add-wrap">
      <button class="add-link" id="addBtn">+ Добавить</button>
    </div>
    <a class="nav-mod-link" id="navModBtn" href="moderation.html" style="display:none">
      <span>Модерация</span>
      <span class="nav-mod-badge" id="navModBadge" style="display:none">0</span>
    </a>
    <span class="nav-divider"></span>
    <button class="auth-link" id="btnAuth">Войти</button>
    <div class="who-wrap" id="whoWrap">
      <button class="who-chip" id="whoChip">
        <span class="avatar" id="whoAvatar"></span>
        <span id="whoName"></span>
      </button>
      <div class="dropdown" id="whoDropdown">
        <div class="profile-card" id="profileCard"></div>
        <a class="opt" id="modLink" href="moderation.html" style="display:none"><div class="t">Модерация</div></a>
        <button class="opt" id="btnLogout"><div class="t">Выйти</div></button>
      </div>
    </div>
  </div>
</header>
`;

const MODALS_HTML = `
<div class="overlay" id="authOverlay">
  <div class="modal">
    <button class="close" data-close>×</button>
    <div id="stepEmail">
      <h2>Войти / зарегистрироваться</h2>
      <label>Email</label>
      <input type="email" id="inEmail" placeholder="you@example.com" autocomplete="email">
      <div class="hint">На почту придёт код из 8 цифр. Если вы здесь впервые — дальше попросим представиться.</div>
      <div class="err" id="errEmail"></div>
      <div class="row-actions"><button class="primary" id="btnSendCode">Получить код</button></div>
    </div>
    <div id="stepCode" style="display:none">
      <h2>Код из письма</h2>
      <div class="hint" id="codeSentTo"></div>
      <label>Код (8 цифр)</label>
      <input type="text" id="inCode" inputmode="numeric" maxlength="8" placeholder="12345678">
      <div class="err" id="errCode"></div>
      <div class="row-actions split">
        <span class="linkgroup">
          <button type="button" class="linklike" id="btnChangeEmail">Другой email</button>
          <button type="button" class="linklike" id="btnResendCode">Отправить снова</button>
        </span>
        <button class="primary" id="btnVerifyCode">Подтвердить</button>
      </div>
    </div>
    <div id="stepProfile" style="display:none">
      <h2>Представьтесь</h2>
      <label>Имя и фамилия</label>
      <input type="text" id="inName" placeholder="Имя Фамилия">
      <label>Кем вы приходитесь Т.И.?</label>
      <select id="inRelation">
        <option value="ученик">Ученик(ца)</option>
        <option value="коллега">Коллега</option>
        <option value="другое">Другое</option>
      </select>
      <div id="gradYearWrap">
        <label>Год выпуска</label>
        <input type="number" id="inGradYear" placeholder="например, 1998" min="1955" max="2026">
      </div>
      <div class="err" id="errProfile"></div>
      <div class="row-actions"><button class="primary" id="btnSaveProfile">Готово</button></div>
    </div>
  </div>
</div>

<!-- Единая модалка добавления с табами: Событие · Человек · Материал -->
<div class="overlay overlay-bottom-sheet" id="unifiedAddOverlay">
  <div class="modal modal-unified-add">
    <div class="modal-header">
      <h2>Добавить на сайт</h2>
      <button class="modal-close-btn" data-close aria-label="Закрыть">×</button>
    </div>

    <div class="add-tabs-bar" role="tablist">
      <button type="button" class="add-tab-btn active" data-tab="event" role="tab">Событие</button>
      <button type="button" class="add-tab-btn" data-tab="person" role="tab">Человек</button>
      <button type="button" class="add-tab-btn" data-tab="article" role="tab">Материал</button>
    </div>

    <div class="modal-body">
      <!-- Таб 1: Событие -->
      <div class="tab-pane active" id="tabPaneEvent">
        <form id="formAddEvent" onsubmit="return false;">
          <label for="uEvYear">Год события *</label>
          <input type="number" id="uEvYear" placeholder="например, 1962" min="1940" max="2026" required>

          <label for="uEvTitle">Что произошло *</label>
          <input type="text" id="uEvTitle" placeholder="Короткое название события" required>

          <label for="uEvDesc">Подробности (необязательно)</label>
          <textarea id="uEvDesc" placeholder="Пара предложений — что было, откуда вам это известно"></textarea>

          <label for="uEvSource">Источник / ссылка (необязательно)</label>
          <input type="text" id="uEvSource" placeholder="Фото афиши, ссылка на статью, чьи слова и т.п.">

          <div class="err" id="errUEvent"></div>
          <div class="hint">Появится на таймлайне с пометкой «не подтверждено», пока модератор не проверит.</div>

          <div class="row-actions">
            <button type="button" class="primary" id="btnSubmitUEvent">Отправить</button>
          </div>
        </form>
      </div>

      <!-- Таб 2: Человек -->
      <div class="tab-pane" id="tabPanePerson">
        <form id="formAddPerson" onsubmit="return false;">
          <label for="uPFullName">Имя и фамилия *</label>
          <input type="text" id="uPFullName" placeholder="Имя Фамилия" required>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
            <div>
              <label for="uPGender">Пол</label>
              <select id="uPGender">
                <option value="">Не указан</option>
                <option value="m">Мужской (ученик)</option>
                <option value="f">Женский (ученица)</option>
              </select>
            </div>
            <div>
              <label for="uPRelation">Кем приходится Т.И.?</label>
              <select id="uPRelation">
                <option value="ученик">Ученик / Ученица</option>
                <option value="коллега">Коллега</option>
                <option value="другое">Другое</option>
              </select>
            </div>
          </div>

          <div id="uPStudyWrap">
            <label>Обучение у Т.И. Хитровой</label>
            <div class="study-box-wrap">
              <label class="study-check-row">
                <input type="checkbox" id="uPChoirSchool"> Хоровое училище им. М.И. Глинки
              </label>
              <div id="uPChoirBox" style="display:none; margin:4px 0 8px 24px">
                <input type="number" id="uPChoirEnd" placeholder="год выпуска (напр. 1980)" min="1955" max="2026">
              </div>

              <label class="study-check-row">
                <input type="checkbox" id="uPConservatory"> СПбГК им. Н.А. Римского-Корсакова
              </label>
              <div id="uPConservatoryBox" style="display:none; margin:4px 0 8px 24px">
                <input type="number" id="uPConservatoryEnd" placeholder="год выпуска (напр. 1985)" min="1955" max="2026">
              </div>

              <label class="study-check-row">
                <input type="checkbox" id="uPAssistantship"> Ассистентура-стажировка в СПбГК
              </label>
              <div id="uPAssistantBox" style="display:none; margin:4px 0 8px 24px">
                <input type="number" id="uPAssistantEnd" placeholder="год окончания (напр. 2005)" min="1955" max="2026">
              </div>
            </div>

            <label>Или другие годы учёбы (необязательно)</label>
            <div style="display:flex; gap:8px">
              <input type="number" id="uPStudyStart" placeholder="начало" min="1955" max="2026">
              <input type="number" id="uPStudyEnd" placeholder="окончание" min="1955" max="2026">
            </div>
          </div>

          <label for="uPInstitution">Место работы / должность (необязательно)</label>
          <input type="text" id="uPInstitution" placeholder="например, преподаватель Хорового училища">

          <label for="uPNotes">Ещё что-то важное (необязательно)</label>
          <textarea id="uPNotes" placeholder="Звания, достижения, каким запомнился"></textarea>

          <label for="uPSource">Источник / ссылка (необязательно)</label>
          <input type="text" id="uPSource" placeholder="Откуда эта информация">

          <div class="err" id="errUPerson"></div>
          <div class="hint">Появится в «Людях» с пометкой «не подтверждено», пока модератор не проверит.</div>

          <div class="row-actions">
            <button type="button" class="primary" id="btnSubmitUPerson">Отправить</button>
          </div>
        </form>
      </div>

      <!-- Таб 3: Материал -->
      <div class="tab-pane" id="tabPaneArticle">
        <form id="formAddArticle" onsubmit="return false;">
          <label for="uArtTitle">Заголовок материала (необязательно)</label>
          <input type="text" id="uArtTitle" placeholder="Название статьи, интервью или воспоминания">

          <label for="uArtCategory">Раздел / Авторство</label>
          <select id="uArtCategory">
            <option value="community">От учеников и коллег (воспоминания, статьи о Т.И.)</option>
            <option value="ti">От Татьяны Ивановны (труды, статьи, интервью Т.И.)</option>
          </select>

          <label for="uArtType">Тип материала</label>
          <select id="uArtType">
            <option value="воспоминание">Воспоминание</option>
            <option value="статья">Статья или очерк о Т.И.</option>
            <option value="другое">Другой материал</option>
          </select>

          <div class="err" id="errUArticle"></div>
          <div class="hint">Откроется редактор, где можно написать текст, вставить фотографии и отправить материал на публикацию.</div>

          <div class="row-actions">
            <button type="button" class="primary" id="btnContinueArticle">Продолжить в редакторе</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
`;

let currentUser = null;
let myProfile = null;

function open_(id){ document.getElementById(id).classList.add("open"); }
function close_(id){ document.getElementById(id).classList.remove("open"); }

function resetAuthModal(){
  document.getElementById("stepEmail").style.display = "block";
  document.getElementById("stepCode").style.display = "none";
  document.getElementById("stepProfile").style.display = "none";
  document.getElementById("errEmail").style.display = "none";
  document.getElementById("errCode").style.display = "none";
  document.getElementById("errProfile").style.display = "none";
}

function personRelationLabel(p){
  if(!p) return "";
  const rel = p.relation_type || "ученик";
  if(rel === "ученик"){
    if(p.gender === "m") return "Ученик";
    if(p.gender === "f") return "Ученица";
    return "Ученик(ца)";
  }
  if(rel === "коллега") return "Коллега";
  return rel;
}
window.personRelationLabel = personRelationLabel;

const relLabel = { "ученик": "Ученик(ца)", "коллега": "Коллега", "другое": "Другое" };

function onLoggedIn(profile){
  myProfile = profile;
  document.getElementById("btnAuth").style.display = "none";
  document.getElementById("whoWrap").style.display = "block";
  document.getElementById("whoName").textContent = profile.full_name;
  document.getElementById("whoAvatar").textContent = profile.full_name.trim().charAt(0).toUpperCase();

  let rows = `<div class="pn">${profile.full_name}</div><div class="pr">${relLabel[profile.relation_type] || profile.relation_type}`;
  if(profile.relation_type === "ученик" && profile.study_end) rows += ` · выпуск ${profile.study_end}`;
  rows += `</div>`;
  document.getElementById("profileCard").innerHTML = rows;

  if(profile.is_moderator){
    document.getElementById("modLink").style.display = "block";
    const navModBtn = document.getElementById("navModBtn");
    if(navModBtn) navModBtn.style.display = "inline-flex";
    updateModBadge();
  }
}

async function updateModBadge(){
  if(!myProfile || !myProfile.is_moderator) return;
  const badge = document.getElementById("navModBadge");
  if(!badge) return;
  try{
    const [evRes, pRes, artRes, revRes] = await Promise.all([
      sb.from("events").select("*", { count: "exact", head: true }).eq("status", "unconfirmed"),
      sb.from("people").select("*", { count: "exact", head: true }).eq("status", "unconfirmed"),
      sb.from("articles").select("*", { count: "exact", head: true }).eq("status", "unconfirmed"),
      sb.from("revisions").select("*", { count: "exact", head: true }).eq("status", "pending")
    ]);
    let total = 0;
    if(!evRes.error && evRes.count) total += evRes.count;
    if(!pRes.error && pRes.count) total += pRes.count;
    if(!artRes.error && artRes.count) total += artRes.count;
    if(!revRes.error && revRes.count) total += revRes.count;
    if(total > 0){
      badge.textContent = total;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }catch(e){
    console.error("Failed to load moderation count:", e);
  }
}
window.updateModBadge = updateModBadge;

// ---------- Тост уведомления (например, "Отправлено на проверку") ----------
function showToast(msg){
  let toast = document.getElementById("siteToast");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "siteToast";
    toast.className = "site-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg || "Отправлено на проверку";
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}
window.showToast = showToast;

// ---------- Логика единого окна «+ Добавить» ----------
const ART_TYPES_BY_CAT = {
  community: [
    { value: "воспоминание", label: "Воспоминание" },
    { value: "статья", label: "Статья или очерк о Т.И." },
    { value: "другое", label: "Другой материал" }
  ],
  ti: [
    { value: "статья", label: "Статья или публикация Т.И." },
    { value: "интервью", label: "Интервью с Т.И." },
    { value: "публикация", label: "Публикация / архивный очерк" },
    { value: "другое", label: "Другой материал" }
  ]
};

function updateArticleTypeOptions(){
  const catEl = document.getElementById("uArtCategory");
  const typeEl = document.getElementById("uArtType");
  if(!catEl || !typeEl) return;
  const cat = catEl.value || "community";
  const types = ART_TYPES_BY_CAT[cat] || ART_TYPES_BY_CAT.community;
  const currentVal = typeEl.value;
  typeEl.innerHTML = types.map(t => `<option value="${t.value}">${t.label}</option>`).join("");
  if(types.some(t => t.value === currentVal)){
    typeEl.value = currentVal;
  }
}
window.updateArticleTypeOptions = updateArticleTypeOptions;

function switchAddTab(tab){
  const validTabs = ["event", "person", "article"];
  if(!validTabs.includes(tab)) tab = "event";
  document.querySelectorAll(".add-tab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === `tabPane${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  });
}
window.switchAddTab = switchAddTab;

function openAddModal(tab){
  if(!currentUser){
    resetAuthModal();
    open_("authOverlay");
    return;
  }
  if(!tab){
    const page = document.body.dataset.page;
    if(page === "index") tab = "event";
    else if(page === "people" || page === "person" || document.body.classList.contains("page-person")) tab = "person";
    else if(page === "nasledie") tab = "article";
    else tab = "event";
  }
  switchAddTab(tab);
  open_("unifiedAddOverlay");
}
window.openAddModal = openAddModal;

// Функция отправки события из таба «Событие»
async function submitEventForm(){
  if(!currentUser){ resetAuthModal(); open_("authOverlay"); return; }
  const yearInput = document.getElementById("uEvYear");
  const titleInput = document.getElementById("uEvTitle");
  const descInput = document.getElementById("uEvDesc");
  const sourceInput = document.getElementById("uEvSource");
  const errEl = document.getElementById("errUEvent");
  const btn = document.getElementById("btnSubmitUEvent");

  const event_year = parseInt(yearInput.value, 10);
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const source = sourceInput.value.trim();

  if(!event_year || !title){
    errEl.textContent = "Заполните год и название события";
    errEl.style.display = "block";
    return;
  }
  errEl.style.display = "none";
  if(btn){ btn.disabled = true; btn.textContent = "Отправка…"; }

  try {
    const { error } = await sb.from("events").insert({
      event_year,
      title,
      description: description || null,
      source: source || null,
      created_by: currentUser.id,
      created_by_name: myProfile ? myProfile.full_name : ""
    });

    if(error){
      errEl.textContent = error.message;
      errEl.style.display = "block";
      if(btn){ btn.disabled = false; btn.textContent = "Отправить"; }
      return;
    }

    close_("unifiedAddOverlay");
    yearInput.value = "";
    titleInput.value = "";
    descInput.value = "";
    sourceInput.value = "";
    if(btn){ btn.disabled = false; btn.textContent = "Отправить"; }

    showToast("Отправлено на проверку");
    if(typeof window.onEventAdded === "function") window.onEventAdded();
    if(typeof updateModBadge === "function") updateModBadge();
  } catch(e){
    errEl.textContent = e.message || "Ошибка при отправке";
    errEl.style.display = "block";
    if(btn){ btn.disabled = false; btn.textContent = "Отправить"; }
  }
}
window.submitEventForm = submitEventForm;

// Функция отправки человека из таба «Человек»
async function submitPersonForm(){
  if(!currentUser){ resetAuthModal(); open_("authOverlay"); return; }
  const nameInput = document.getElementById("uPFullName");
  const genderInput = document.getElementById("uPGender");
  const relationInput = document.getElementById("uPRelation");
  const choirChk = document.getElementById("uPChoirSchool");
  const choirEndInput = document.getElementById("uPChoirEnd");
  const consChk = document.getElementById("uPConservatory");
  const consEndInput = document.getElementById("uPConservatoryEnd");
  const assistChk = document.getElementById("uPAssistantship");
  const assistEndInput = document.getElementById("uPAssistantEnd");
  const studyStartInput = document.getElementById("uPStudyStart");
  const studyEndInput = document.getElementById("uPStudyEnd");
  const instInput = document.getElementById("uPInstitution");
  const notesInput = document.getElementById("uPNotes");
  const sourceInput = document.getElementById("uPSource");
  const errEl = document.getElementById("errUPerson");
  const btn = document.getElementById("btnSubmitUPerson");

  const full_name = nameInput.value.trim();
  const gender = genderInput.value || null;
  const relation_type = relationInput.value;
  const studied_choir_school = choirChk ? choirChk.checked : false;
  const choir_school_end = (studied_choir_school && choirEndInput.value) ? parseInt(choirEndInput.value, 10) : null;
  const studied_conservatory = consChk ? consChk.checked : false;
  const conservatory_end = (studied_conservatory && consEndInput.value) ? parseInt(consEndInput.value, 10) : null;
  const studied_assistantship = assistChk ? assistChk.checked : false;
  const assistantship_end = (studied_assistantship && assistEndInput.value) ? parseInt(assistEndInput.value, 10) : null;

  let study_start = relation_type === "ученик" && studyStartInput.value ? parseInt(studyStartInput.value, 10) : null;
  let study_end = relation_type === "ученик" && studyEndInput.value ? parseInt(studyEndInput.value, 10) : null;
  if(!study_end && relation_type === "ученик"){
    study_end = Math.max(choir_school_end || 0, conservatory_end || 0, assistantship_end || 0) || null;
  }
  const institution = instInput.value.trim();
  const notes = notesInput.value.trim();
  const source = sourceInput.value.trim();

  if(!full_name){
    errEl.textContent = "Укажите имя и фамилию";
    errEl.style.display = "block";
    return;
  }
  errEl.style.display = "none";
  if(btn){ btn.disabled = true; btn.textContent = "Отправка…"; }

  try {
    const { error } = await sb.from("people").insert({
      full_name,
      gender,
      relation_type,
      studied_choir_school,
      choir_school_end,
      studied_conservatory,
      conservatory_end,
      studied_assistantship,
      assistantship_end,
      study_start,
      study_end,
      institution: institution || null,
      notes: notes || null,
      source: source || null,
      created_by: currentUser.id,
      created_by_name: myProfile ? myProfile.full_name : ""
    });

    if(error){
      errEl.textContent = error.message;
      errEl.style.display = "block";
      if(btn){ btn.disabled = false; btn.textContent = "Отправить"; }
      return;
    }

    close_("unifiedAddOverlay");
    nameInput.value = "";
    genderInput.value = "";
    relationInput.value = "ученик";
    const studyWrap = document.getElementById("uPStudyWrap");
    if(studyWrap) studyWrap.style.display = "block";
    if(choirChk){ choirChk.checked = false; document.getElementById("uPChoirBox").style.display = "none"; }
    choirEndInput.value = "";
    if(consChk){ consChk.checked = false; document.getElementById("uPConservatoryBox").style.display = "none"; }
    consEndInput.value = "";
    if(assistChk){ assistChk.checked = false; document.getElementById("uPAssistantBox").style.display = "none"; }
    assistEndInput.value = "";
    studyStartInput.value = "";
    studyEndInput.value = "";
    instInput.value = "";
    notesInput.value = "";
    sourceInput.value = "";
    if(btn){ btn.disabled = false; btn.textContent = "Отправить"; }

    showToast("Отправлено на проверку");
    if(typeof window.onPersonAdded === "function") window.onPersonAdded();
    if(typeof updateModBadge === "function") updateModBadge();
  } catch(e){
    errEl.textContent = e.message || "Ошибка при отправке";
    errEl.style.display = "block";
    if(btn){ btn.disabled = false; btn.textContent = "Отправить"; }
  }
}
window.submitPersonForm = submitPersonForm;

// Функция создания черновика из таба «Материал»
async function submitArticleDraft(){
  if(!currentUser){ resetAuthModal(); open_("authOverlay"); return; }
  const titleInput = document.getElementById("uArtTitle");
  const catSelect = document.getElementById("uArtCategory");
  const typeSelect = document.getElementById("uArtType");
  const errEl = document.getElementById("errUArticle");
  const btn = document.getElementById("btnContinueArticle");

  const author_type = catSelect.value || "community";
  const type = typeSelect.value || "воспоминание";
  const title = titleInput.value.trim();
  const author_name = author_type === "ti" ? "Татьяна Ивановна Хитрова" : (myProfile ? myProfile.full_name : "Автор");

  errEl.style.display = "none";
  if(btn){ btn.disabled = true; btn.textContent = "Создание черновика…"; }

  try {
    const { data, error } = await sb.from("articles").insert({
      author_type,
      type,
      author_name,
      title,
      content: { blocks: [], meta: { author_type, type, author_name } },
      status: "draft",
      created_by: currentUser.id,
      created_by_name: myProfile ? myProfile.full_name : ""
    }).select().single();

    if(error){
      errEl.textContent = error.message;
      errEl.style.display = "block";
      if(btn){ btn.disabled = false; btn.textContent = "Продолжить в редакторе"; }
      return;
    }

    close_("unifiedAddOverlay");
    titleInput.value = "";
    if(btn){ btn.disabled = false; btn.textContent = "Продолжить в редакторе"; }

    if(location.pathname.endsWith("nasledie.html")){
      location.hash = `#edit/${data.id}`;
    } else {
      window.location.href = `nasledie.html#edit/${data.id}`;
    }
  } catch(e){
    errEl.textContent = e.message || "Ошибка при создании";
    errEl.style.display = "block";
    if(btn){ btn.disabled = false; btn.textContent = "Продолжить в редакторе"; }
  }
}
window.submitArticleDraft = submitArticleDraft;

function initHeader(){
  if(document.querySelector(".site-nav")) return;
  document.body.insertAdjacentHTML("afterbegin", MODALS_HTML);
  document.body.insertAdjacentHTML("afterbegin", HEADER_HTML);

  const page = document.body.dataset.page;
  const activeLink = document.querySelector(`.site-nav a[data-page="${page}"]`);
  if(activeLink) activeLink.classList.add("active");

  // подхватываем позицию меню, посчитанную на "Линии жизни" в прошлый раз — чтобы не прыгало между страницами.
  // тот же отступ применяем к блоку страниц-заглушек (Люди/Наследие), чтобы всё стояло в одну сетку
  try {
    const saved = localStorage.getItem("navMarginLeft");
    const linksEl = document.querySelector(".site-nav .links");
    if(saved !== null && linksEl){
      linksEl.style.marginLeft = saved + "px";
      document.body.classList.add("nav-ready");
      if(window.innerWidth > 640){
        const stubEl = document.querySelector(".stub");
        if(stubEl) stubEl.style.paddingLeft = (20 + parseInt(saved, 10)) + "px"; // 20 = свой паддинг .site-nav
      }
    }
  } catch(e){}

  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", e => close_(e.target.closest(".overlay").id)));

  document.getElementById("btnAuth").addEventListener("click", () => { resetAuthModal(); open_("authOverlay"); });

  const addBtn = document.getElementById("addBtn");
  if(addBtn){
    addBtn.addEventListener("click", e => {
      e.stopPropagation();
      openAddModal();
    });
  }

  document.querySelectorAll(".add-tab-btn").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      switchAddTab(tabBtn.dataset.tab);
    });
  });

  const uArtCategory = document.getElementById("uArtCategory");
  if(uArtCategory){
    uArtCategory.addEventListener("change", updateArticleTypeOptions);
  }

  const uPRelation = document.getElementById("uPRelation");
  const uPStudyWrap = document.getElementById("uPStudyWrap");
  if(uPRelation && uPStudyWrap){
    uPRelation.addEventListener("change", e => {
      uPStudyWrap.style.display = e.target.value === "ученик" ? "block" : "none";
    });
  }

  const uPChoirSchool = document.getElementById("uPChoirSchool");
  const uPChoirBox = document.getElementById("uPChoirBox");
  if(uPChoirSchool && uPChoirBox){
    uPChoirSchool.addEventListener("change", () => {
      uPChoirBox.style.display = uPChoirSchool.checked ? "block" : "none";
    });
  }

  const uPConservatory = document.getElementById("uPConservatory");
  const uPConservatoryBox = document.getElementById("uPConservatoryBox");
  if(uPConservatory && uPConservatoryBox){
    uPConservatory.addEventListener("change", () => {
      uPConservatoryBox.style.display = uPConservatory.checked ? "block" : "none";
    });
  }

  const uPAssistantship = document.getElementById("uPAssistantship");
  const uPAssistantBox = document.getElementById("uPAssistantBox");
  if(uPAssistantship && uPAssistantBox){
    uPAssistantship.addEventListener("change", () => {
      uPAssistantBox.style.display = uPAssistantship.checked ? "block" : "none";
    });
  }

  const btnSubmitUEvent = document.getElementById("btnSubmitUEvent");
  if(btnSubmitUEvent){
    btnSubmitUEvent.addEventListener("click", submitEventForm);
  }
  const btnSubmitUPerson = document.getElementById("btnSubmitUPerson");
  if(btnSubmitUPerson){
    btnSubmitUPerson.addEventListener("click", submitPersonForm);
  }
  const btnContinueArticle = document.getElementById("btnContinueArticle");
  if(btnContinueArticle){
    btnContinueArticle.addEventListener("click", submitArticleDraft);
  }

  const whoChip = document.getElementById("whoChip");
  const whoDropdown = document.getElementById("whoDropdown");
  whoChip.addEventListener("click", e => { e.stopPropagation(); whoDropdown.classList.toggle("open"); });
  document.getElementById("btnLogout").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

  // Функция инициализации живого поиска людей с подсказками (используется на person.html и др.)
  let cachedConfirmedPeople = null;
  let fetchingConfirmedPeople = null;

  async function loadConfirmedPeople(){
    if(cachedConfirmedPeople) return cachedConfirmedPeople;
    if(!fetchingConfirmedPeople){
      fetchingConfirmedPeople = sb.from("people")
        .select("id, full_name, gender, relation_type, study_start, study_end, studied_choir_school, choir_school_start, choir_school_end, studied_conservatory, conservatory_start, conservatory_end, studied_assistantship, assistantship_start, assistantship_end, institution, notes, avatar_url")
        .eq("status", "confirmed")
        .order("full_name")
        .then(res => {
          cachedConfirmedPeople = res.data || [];
          return cachedConfirmedPeople;
        }).catch(err => {
          console.error("Failed to load people for search:", err);
          return [];
        });
    }
    return fetchingConfirmedPeople;
  }
  window.loadConfirmedPeople = loadConfirmedPeople;

  function normalizeSearchStr(s){
    return (s || "").toLowerCase().replace(/ё/g, "е").trim();
  }
  window.normalizeSearchStr = normalizeSearchStr;

  function getSearchSubtitle(p){
    const parts = [];
    if(p.studied_choir_school){
      parts.push(p.choir_school_end ? `ХУ вып. ${p.choir_school_end}` : "ХУ");
    }
    if(p.studied_conservatory){
      parts.push(p.conservatory_end ? `СПбГК вып. ${p.conservatory_end}` : "СПбГК");
    }
    if(p.studied_assistantship){
      parts.push(p.assistantship_end ? `ассист. ${p.assistantship_end}` : "СПбГК ассист.");
    }
    if(!parts.length && p.study_end){
      parts.push(`выпуск ${p.study_end} г.`);
    }
    if(!parts.length){
      parts.push(personRelationLabel(p));
    }
    if(p.institution){
      parts.push(p.institution);
    }
    return parts.join(" · ");
  }
  window.getSearchSubtitle = getSearchSubtitle;

  function getSearchHaystack(p){
    const years = [
      p.study_start, p.study_end,
      p.choir_school_start, p.choir_school_end,
      p.conservatory_start, p.conservatory_end,
      p.assistantship_start, p.assistantship_end
    ].filter(Boolean).join(" ");
    return normalizeSearchStr(`${p.full_name} ${personRelationLabel(p)} ${years} ${p.institution || ""} ${p.notes || ""}`);
  }
  window.getSearchHaystack = getSearchHaystack;

  function initPeopleSearch(searchInput, searchDropdown, options = {}){
    if(!searchInput || !searchDropdown) return;
    let selectedSearchIndex = -1;

    async function renderSearchResults(){
      const query = normalizeSearchStr(searchInput.value);
      const words = query.split(/\s+/).filter(Boolean);
      if(!words.length){
        searchDropdown.classList.remove("open");
        searchDropdown.innerHTML = "";
        selectedSearchIndex = -1;
        return;
      }

      const people = await loadConfirmedPeople();
      const matches = people.filter(p => {
        const h = getSearchHaystack(p);
        return words.every(w => h.includes(w));
      });

      if(!matches.length){
        searchDropdown.innerHTML = `<div class="person-search-empty">Ничего не найдено</div>`;
        searchDropdown.classList.add("open");
        selectedSearchIndex = -1;
        return;
      }

      selectedSearchIndex = 0;
      searchDropdown.innerHTML = matches.slice(0, 8).map((p, i) => {
        const avatarHtml = p.avatar_url
          ? `<img src="${escapeHtml(p.avatar_url)}" alt="">`
          : escapeHtml(p.full_name.trim().charAt(0).toUpperCase());
        const sub = getSearchSubtitle(p);
        return `
          <a href="person.html?id=${p.id}" class="person-search-item ${i === 0 ? 'selected' : ''}" data-index="${i}">
            <div class="person-search-avatar">${avatarHtml}</div>
            <div class="person-search-info">
              <div class="person-search-name">${escapeHtml(p.full_name)}</div>
              <div class="person-search-sub">${escapeHtml(sub)}</div>
            </div>
          </a>
        `;
      }).join("");
      searchDropdown.classList.add("open");
    }

    searchInput.addEventListener("focus", () => {
      loadConfirmedPeople();
      if(searchInput.value.trim()) renderSearchResults();
    });
    searchInput.addEventListener("input", renderSearchResults);

    searchInput.addEventListener("keydown", e => {
      const items = searchDropdown.querySelectorAll(".person-search-item");
      if(!items.length || !searchDropdown.classList.contains("open")) return;

      if(e.key === "ArrowDown"){
        e.preventDefault();
        selectedSearchIndex = (selectedSearchIndex + 1) % items.length;
        items.forEach((it, idx) => it.classList.toggle("selected", idx === selectedSearchIndex));
        if(items[selectedSearchIndex]) items[selectedSearchIndex].scrollIntoView({ block: "nearest" });
      } else if(e.key === "ArrowUp"){
        e.preventDefault();
        selectedSearchIndex = (selectedSearchIndex - 1 + items.length) % items.length;
        items.forEach((it, idx) => it.classList.toggle("selected", idx === selectedSearchIndex));
        if(items[selectedSearchIndex]) items[selectedSearchIndex].scrollIntoView({ block: "nearest" });
      } else if(e.key === "Enter"){
        e.preventDefault();
        const active = searchDropdown.querySelector(".person-search-item.selected") || items[0];
        if(active){
          if(options.onSelect) options.onSelect(active);
          else window.location.href = active.getAttribute("href");
        }
      } else if(e.key === "Escape"){
        searchDropdown.classList.remove("open");
        searchInput.blur();
      }
    });

    document.addEventListener("click", e => {
      if(!searchInput.contains(e.target) && !searchDropdown.contains(e.target)){
        searchDropdown.classList.remove("open");
      }
    });
  }
  window.initPeopleSearch = initPeopleSearch;

  // бургер — на мобильном открывает панель с "добавить материал" / "войти"
  const burgerBtn = document.getElementById("burgerBtn");
  const navRight = document.querySelector(".nav-right");
  burgerBtn.addEventListener("click", e => { e.stopPropagation(); navRight.classList.toggle("open"); });

  document.addEventListener("click", e => {
    whoDropdown.classList.remove("open");
    navRight.classList.remove("open");
    if(searchWrap && !searchWrap.contains(e.target)){
      searchDropdown.classList.remove("open");
    }
  });

  document.getElementById("inRelation").addEventListener("change", e => {
    document.getElementById("gradYearWrap").style.display = e.target.value === "ученик" ? "block" : "none";
  });

  // только цифры в поле кода
  document.getElementById("inCode").addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "");
  });

  let pendingEmail = null;

  async function sendCode(){
    const errEl = document.getElementById("errEmail");
    errEl.style.display = "none";
    const { error } = await sb.auth.signInWithOtp({ email: pendingEmail, options: { shouldCreateUser: true } });
    if(error){ errEl.textContent = error.message; errEl.style.display = "block"; return false; }
    return true;
  }

  document.getElementById("btnSendCode").addEventListener("click", async () => {
    const email = document.getElementById("inEmail").value.trim();
    const errEl = document.getElementById("errEmail");
    if(!email || !email.includes("@")){ errEl.textContent = "Введите email"; errEl.style.display = "block"; return; }
    pendingEmail = email;
    const ok = await sendCode();
    if(!ok) return;
    document.getElementById("codeSentTo").innerHTML = `Код отправлен на <b>${pendingEmail}</b>`;
    document.getElementById("stepEmail").style.display = "none";
    document.getElementById("stepCode").style.display = "block";
  });

  document.getElementById("btnChangeEmail").addEventListener("click", () => {
    document.getElementById("errCode").style.display = "none";
    document.getElementById("stepCode").style.display = "none";
    document.getElementById("stepEmail").style.display = "block";
  });

  document.getElementById("btnResendCode").addEventListener("click", async () => {
    const errEl = document.getElementById("errCode");
    const ok = await sendCode();
    if(!ok){
      const emailErr = document.getElementById("errEmail");
      errEl.textContent = emailErr.textContent;
      errEl.style.display = "block";
      return;
    }
    errEl.style.display = "none";
    document.getElementById("codeSentTo").innerHTML = `Код отправлен повторно на <b>${pendingEmail}</b>`;
  });

  document.getElementById("btnVerifyCode").addEventListener("click", async () => {
    const token = document.getElementById("inCode").value.trim();
    const errEl = document.getElementById("errCode");
    const { data, error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: "email" });
    if(error){ errEl.textContent = "Неверный или устаревший код"; errEl.style.display = "block"; return; }
    currentUser = data.user;
    const { data: profile } = await sb.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
    if(profile){ close_("authOverlay"); onLoggedIn(profile); }
    else{
      document.getElementById("stepCode").style.display = "none";
      document.getElementById("stepProfile").style.display = "block";
    }
  });

  document.getElementById("btnSaveProfile").addEventListener("click", async () => {
    const full_name = document.getElementById("inName").value.trim();
    const relation_type = document.getElementById("inRelation").value;
    const gradRaw = document.getElementById("inGradYear").value;
    const study_end = relation_type === "ученик" && gradRaw ? parseInt(gradRaw, 10) : null;
    const errEl = document.getElementById("errProfile");
    if(!full_name){ errEl.textContent = "Укажите имя и фамилию"; errEl.style.display = "block"; return; }
    const { data: profile, error } = await sb.from("profiles").insert({ id: currentUser.id, full_name, relation_type, study_end }).select().single();
    if(error){ errEl.textContent = error.message; errEl.style.display = "block"; return; }
    close_("authOverlay");
    onLoggedIn(profile);
  });



  sb.auth.onAuthStateChange(async (event, session) => {
    if(session && session.user){
      currentUser = session.user;
      const { data: profile } = await sb.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
      if(profile) onLoggedIn(profile);
    }
    // сигнал для других страниц (например moderation.html) — авторизация проверена, можно смотреть currentUser/myProfile
    window.dispatchEvent(new Event("authReady"));
  });
}

// ---------- общие хелперы для статей "Наследия" (используются на nasledie.html и moderation.html) ----------
function escapeHtml(s){
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function formatDate(iso){
  if(!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" });
}

// текст из Editor.js хранится с инлайн-разметкой (<b>, <i>, <a>...) — просто escapeHtml её сломает,
// а доверять как есть нельзя (paste может принести произвольный HTML), поэтому чистим DOMPurify
function sanitizeInline(html){
  if(window.DOMPurify) return DOMPurify.sanitize(html || "", { ALLOWED_TAGS: ["b","i","u","s","a","mark","code","br"], ALLOWED_ATTR: ["href","target","rel"] });
  return escapeHtml(html);
}

function renderListItems(items){
  if(!items || !items.length) return "";
  return items.map(it => {
    const content = typeof it === "string" ? it : (it.content || "");
    const nested = (it && typeof it === "object" && it.items && it.items.length) ? `<ul>${renderListItems(it.items)}</ul>` : "";
    return `<li>${sanitizeInline(content)}${nested}</li>`;
  }).join("");
}

// JSON-блоки Editor.js -> HTML для чтения/предпросмотра
function renderArticleContent(content){
  const blocks = (content && content.blocks) || [];
  return blocks.map(b => {
    const d = b.data || {};
    switch(b.type){
      case "header": {
        const lvl = Math.min(Math.max(parseInt(d.level, 10) || 2, 2), 4);
        return `<h${lvl}>${sanitizeInline(d.text)}</h${lvl}>`;
      }
      case "paragraph":
        return `<p>${sanitizeInline(d.text)}</p>`;
      case "quote":
        return `<blockquote><p>${sanitizeInline(d.text)}</p>${d.caption ? `<cite>${sanitizeInline(d.caption)}</cite>` : ""}</blockquote>`;
      case "list": {
        const tag = d.style === "ordered" ? "ol" : "ul";
        return `<${tag}>${renderListItems(d.items)}</${tag}>`;
      }
      case "table": {
        const rows = d.content || [];
        return `<table>${rows.map((row, i) => {
          const cellTag = (d.withHeadings && i === 0) ? "th" : "td";
          return `<tr>${row.map(cell => `<${cellTag}>${sanitizeInline(cell)}</${cellTag}>`).join("")}</tr>`;
        }).join("")}</table>`;
      }
      case "image":
        return `<figure><img src="${escapeHtml(d.file && d.file.url)}" alt="">${d.caption ? `<figcaption>${sanitizeInline(d.caption)}</figcaption>` : ""}</figure>`;
      default:
        return "";
    }
  }).join("");
}

// короткая выдержка для карточки в списке
function excerptFromContent(content, maxLen){
  maxLen = maxLen || 140;
  const blocks = (content && content.blocks) || [];
  for(const b of blocks){
    let text = null;
    if(b.data){
      if(b.data.text) text = b.data.text;
      else if(b.data.items && b.data.items.length){
        const first = b.data.items[0];
        text = typeof first === "string" ? first : (first && first.content);
      }
    }
    if(text){
      const plain = text.replace(/<[^>]+>/g, "");
      return plain.length > maxLen ? plain.slice(0, maxLen).trim() + "…" : plain;
    }
  }
  return "";
}

document.addEventListener("DOMContentLoaded", initHeader);
