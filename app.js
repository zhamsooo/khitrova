// Общая шапка сайта + авторизация + "добавить материал" — вставляется на каждую страницу,
// чтобы не держать одну и ту же разметку в трёх копиях.

const SUPABASE_URL = "https://vvcxnqqyuvakrcmkmhjq.supabase.co";
const SUPABASE_KEY = "sb_publishable_SMTkWj9fHPpUG3e9arN3tg_knlaKKfp";
const sb = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const CONTACT_EMAIL = "post@khitrova.org";

const HEADER_HTML = `
<header class="appbar">
  <div class="row">
    <a href="index.html" class="title">Татьяна Ивановна Хитрова</a>
    <button class="iconbtn" id="navSearchBtn" aria-label="Поиск" style="display:none"><span class="sym">search</span></button>
    <a class="iconbtn" id="navModBtn" href="moderation.html" aria-label="Модерация" style="display:none">
      <span class="sym">fact_check</span>
      <span class="badge-count" id="navModBadge" style="display:none">0</span>
    </a>
    <button class="btn text" id="btnAuth">Войти</button>
    <div class="who-wrap" id="whoWrap" style="display:none">
      <button class="avatar-btn" id="whoChip" aria-label="Профиль"><span id="whoAvatar"></span></button>
      <span id="whoName" style="display:none"></span>
      <div class="dropdown" id="whoDropdown">
        <div class="profile-card" id="profileCard"></div>
        <a class="opt" id="modLink" href="moderation.html" style="display:none"><div class="t">Модерация</div></a>
        <button class="opt" id="btnLogout"><div class="t">Выйти</div></button>
      </div>
    </div>
  </div>
</header>
<nav class="tabs"><div class="row">
  <a href="index.html" class="tab" data-page="index">Линия жизни</a>
  <a href="people.html" class="tab" data-page="people">Люди</a>
  <a href="nasledie.html" class="tab" data-page="nasledie">Наследие</a>
</div></nav>
<nav class="navbar">
  <a href="index.html" class="nav-item" data-page="index">
    <div class="icon-pill"><span class="sym">timeline</span></div>
    <span>Линия жизни</span>
  </a>
  <a href="people.html" class="nav-item" data-page="people">
    <div class="icon-pill"><span class="sym">group</span></div>
    <span>Люди</span>
  </a>
  <a href="nasledie.html" class="nav-item" data-page="nasledie">
    <div class="icon-pill"><span class="sym">menu_book</span></div>
    <span>Наследие</span>
  </a>
</nav>
<button class="fab" id="fabAdd" aria-label="Добавить"><span class="sym">add</span>Добавить</button>
`;

const MODALS_HTML = `
<div class="overlay" id="authOverlay">
  <div class="modal">
    <div class="modal-header dialog-appbar">
      <button type="button" class="dialog-close-btn" data-close aria-label="Закрыть"><span class="sym">close</span></button>
      <h2 class="dialog-title" id="authModalTitle">Войти</h2>
      <button type="button" class="btn filled dialog-bar-action" id="btnAuthBarAction">Код</button>
    </div>
    <div class="modal-body">
      <div id="stepEmail">
        <div class="field">
          <input type="email" id="inEmail" placeholder="you@example.com" autocomplete="email">
          <label class="lbl" for="inEmail">Email</label>
          <div class="sup">На почту придёт код из 8 цифр</div>
        </div>
        <div class="err" id="errEmail"></div>
        <div class="row-actions">
          <button type="button" class="btn text" data-close>Отмена</button>
          <button type="button" class="btn filled" id="btnSendCode">Получить код</button>
        </div>
      </div>
      <div id="stepCode" style="display:none">
        <div class="hint" id="codeSentTo" style="margin-bottom:16px"></div>
        <div class="field">
          <input type="text" id="inCode" inputmode="numeric" maxlength="8" placeholder="12345678">
          <label class="lbl" for="inCode">Код из письма</label>
          <div class="sup">8 цифр</div>
        </div>
        <div class="err" id="errCode"></div>
        <div class="row-actions split">
          <span class="linkgroup">
            <button type="button" class="btn text" id="btnChangeEmail" style="padding:0">Другой email</button>
            <button type="button" class="btn text" id="btnResendCode" style="padding:0">Отправить снова</button>
          </span>
          <button type="button" class="btn filled" id="btnVerifyCode">Подтвердить</button>
        </div>
      </div>
      <div id="stepProfile" style="display:none">
        <div class="field">
          <input type="text" id="inName" placeholder="Имя Фамилия">
          <label class="lbl" for="inName">Имя и фамилия</label>
        </div>
        <div class="field">
          <select id="inRelation">
            <option value="ученик">Ученик / Ученица</option>
            <option value="коллега">Коллега</option>
            <option value="другое">Другое</option>
          </select>
          <label class="lbl" for="inRelation">Кем вы приходитесь Т.И.?</label>
        </div>
        <div id="gradYearWrap" class="field">
          <input type="number" id="inGradYear" placeholder="например, 1998" min="1955" max="2026">
          <label class="lbl" for="inGradYear">Год выпуска</label>
          <div class="sup">Необязательно</div>
        </div>
        <div class="err" id="errProfile"></div>
        <div class="row-actions">
          <button type="button" class="btn text" data-close>Отмена</button>
          <button type="button" class="btn filled" id="btnSaveProfile">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Единая модалка добавления с табами: Событие · Человек · Материал -->
<div class="overlay" id="unifiedAddOverlay">
  <div class="modal modal-unified-add">
    <div class="modal-header dialog-appbar">
      <button type="button" class="dialog-close-btn" data-close aria-label="Закрыть"><span class="sym">close</span></button>
      <h2 class="dialog-title">Добавить на сайт</h2>
      <button type="button" class="btn filled dialog-bar-action" id="btnUnifiedBarAction">Отправить</button>
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
          <div class="field">
            <input type="number" id="uEvYear" placeholder="например, 1962" min="1940" max="2026" required>
            <label class="lbl" for="uEvYear">Год события</label>
          </div>

          <div class="field">
            <input type="text" id="uEvTitle" placeholder="Короткое название события" required>
            <label class="lbl" for="uEvTitle">Что произошло</label>
          </div>

          <div class="field">
            <textarea id="uEvDesc" placeholder="Пара предложений — что было, откуда вам это известно"></textarea>
            <label class="lbl" for="uEvDesc">Подробности</label>
            <div class="sup">Необязательно</div>
          </div>

          <div class="field">
            <input type="text" id="uEvSource" placeholder="Фото афиши, ссылка на статью, чьи слова и т.п.">
            <label class="lbl" for="uEvSource">Источник / ссылка</label>
            <div class="sup">Необязательно</div>
          </div>

          <div class="err" id="errUEvent"></div>
          <div class="hint">Появится на таймлайне с пометкой «не подтверждено», пока модератор не проверит.</div>

          <div class="row-actions">
            <button type="button" class="btn text" data-close>Отмена</button>
            <button type="button" class="btn filled" id="btnSubmitUEvent">Отправить</button>
          </div>
        </form>
      </div>

      <!-- Таб 2: Человек -->
      <div class="tab-pane" id="tabPanePerson">
        <form id="formAddPerson" onsubmit="return false;">
          <div class="field">
            <input type="text" id="uPFullName" placeholder="Имя Фамилия" required>
            <label class="lbl" for="uPFullName">Имя и фамилия</label>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div class="field">
              <select id="uPGender">
                <option value="">Не указан</option>
                <option value="m">Мужской (ученик)</option>
                <option value="f">Женский (ученица)</option>
              </select>
              <label class="lbl" for="uPGender">Пол</label>
              <div class="sup">Необязательно</div>
            </div>
            <div class="field">
              <select id="uPRelation">
                <option value="ученик">Ученик / Ученица</option>
                <option value="коллега">Коллега</option>
                <option value="другое">Другое</option>
              </select>
              <label class="lbl" for="uPRelation">Кем приходится Т.И.?</label>
            </div>
          </div>

          <div id="uPStudyWrap">
            <label style="font:var(--t-label-medium); font-size:12px; color:var(--on-surface-variant); display:block; margin-bottom:6px">Обучение у Т.И. Хитровой</label>
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

            <div class="field" style="margin-top:12px">
              <div style="display:flex; gap:8px">
                <input type="number" id="uPStudyStart" placeholder="начало" min="1955" max="2026">
                <input type="number" id="uPStudyEnd" placeholder="окончание" min="1955" max="2026">
              </div>
              <label class="lbl">Или другие годы учёбы</label>
              <div class="sup">Необязательно</div>
            </div>
          </div>

          <div class="field">
            <input type="text" id="uPInstitution" placeholder="например, преподаватель Хорового училища">
            <label class="lbl" for="uPInstitution">Место работы / должность</label>
            <div class="sup">Необязательно</div>
          </div>

          <div class="field">
            <textarea id="uPNotes" placeholder="Звания, достижения, каким запомнился"></textarea>
            <label class="lbl" for="uPNotes">Ещё что-то важное</label>
            <div class="sup">Необязательно</div>
          </div>

          <div class="field">
            <input type="text" id="uPSource" placeholder="Откуда эта информация">
            <label class="lbl" for="uPSource">Источник / ссылка</label>
            <div class="sup">Необязательно</div>
          </div>

          <div class="err" id="errUPerson"></div>
          <div class="hint">Появится в «Людях» с пометкой «не подтверждено», пока модератор не проверит.</div>

          <div class="row-actions">
            <button type="button" class="btn text" data-close>Отмена</button>
            <button type="button" class="btn filled" id="btnSubmitUPerson">Отправить</button>
          </div>
        </form>
      </div>

      <!-- Таб 3: Материал -->
      <div class="tab-pane" id="tabPaneArticle">
        <form id="formAddArticle" onsubmit="return false;">
          <div class="field">
            <input type="text" id="uArtTitle" placeholder="Название статьи, интервью или воспоминания">
            <label class="lbl" for="uArtTitle">Заголовок материала</label>
            <div class="sup">Необязательно</div>
          </div>

          <div class="field">
            <select id="uArtCategory">
              <option value="community">От учеников и коллег (воспоминания, статьи о Т.И.)</option>
              <option value="ti">От Татьяны Ивановны (труды, статьи, интервью Т.И.)</option>
            </select>
            <label class="lbl" for="uArtCategory">Раздел / Авторство</label>
          </div>

          <div class="field">
            <select id="uArtType">
              <option value="воспоминание">Воспоминание</option>
              <option value="статья">Статья или очерк о Т.И.</option>
              <option value="интервью">Интервью</option>
              <option value="публикация">Публикация / заметка</option>
              <option value="другое">Другой материал</option>
            </select>
            <label class="lbl" for="uArtType">Тип материала</label>
          </div>

          <div class="err" id="errUArticle"></div>
          <div class="hint">Откроется редактор, где можно написать текст, вставить фотографии и отправить материал на публикацию.</div>

          <div class="row-actions">
            <button type="button" class="btn text" data-close>Отмена</button>
            <button type="button" class="btn filled" id="btnContinueArticle">Продолжить в редакторе</button>
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
  const bar = document.getElementById("btnAuthBarAction");
  const title = document.getElementById("authModalTitle");
  if(bar) bar.textContent = "Код";
  if(title) title.textContent = "Войти";
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
  const btnAuth = document.getElementById("btnAuth");
  if(btnAuth) btnAuth.style.display = "none";
  const whoWrap = document.getElementById("whoWrap");
  if(whoWrap) whoWrap.style.display = "inline-flex";
  const whoName = document.getElementById("whoName");
  if(whoName) whoName.textContent = profile.full_name;
  const whoAvatar = document.getElementById("whoAvatar");
  if(whoAvatar) whoAvatar.textContent = profile.full_name.trim().charAt(0).toUpperCase();

  let rows = `<div class="pn">${profile.full_name}</div><div class="pr">${relLabel[profile.relation_type] || profile.relation_type}`;
  if(profile.relation_type === "ученик" && profile.study_end) rows += ` · выпуск ${profile.study_end}`;
  rows += `</div>`;
  const profileCard = document.getElementById("profileCard");
  if(profileCard) profileCard.innerHTML = rows;

  if(profile.is_moderator){
    const modLink = document.getElementById("modLink");
    if(modLink) modLink.style.display = "block";
    const navModBtn = document.getElementById("navModBtn");
    if(navModBtn) navModBtn.style.display = "grid";
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

// ---------- Тост / Snackbar (4 секунды, M3) ----------
function showToast(msg){
  let toast = document.getElementById("siteToast");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "siteToast";
    toast.className = "snackbar";
    document.body.appendChild(toast);
  }
  toast.textContent = msg || "Отправлено на проверку";
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
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
  const barAction = document.getElementById("btnUnifiedBarAction");
  if(barAction){
    barAction.textContent = tab === "article" ? "Далее" : "Отправить";
  }
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

  yearInput.classList.toggle("invalid", !event_year);
  titleInput.classList.toggle("invalid", !title);

  if(!event_year || !title){
    errEl.textContent = "Заполните год и название события";
    errEl.style.display = "block";
    return;
  }
  yearInput.classList.remove("invalid");
  titleInput.classList.remove("invalid");
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

  nameInput.classList.toggle("invalid", !full_name);
  if(!full_name){
    errEl.textContent = "Укажите имя и фамилию";
    errEl.style.display = "block";
    return;
  }
  nameInput.classList.remove("invalid");
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
  if(document.querySelector(".appbar")) return;
  document.body.insertAdjacentHTML("afterbegin", MODALS_HTML);
  document.body.insertAdjacentHTML("afterbegin", HEADER_HTML);

  const page = document.body.dataset.page;
  if(page){
    document.querySelectorAll(`.tabs .tab[data-page="${page}"]`).forEach(l => l.classList.add("on"));
    document.querySelectorAll(`.navbar .nav-item[data-page="${page}"]`).forEach(l => l.classList.add("on"));
  }

  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", e => close_(e.target.closest(".overlay").id)));

  const btnUnifiedBarAction = document.getElementById("btnUnifiedBarAction");
  if(btnUnifiedBarAction){
    btnUnifiedBarAction.addEventListener("click", () => {
      const activeTab = document.querySelector(".add-tab-btn.active")?.dataset.tab;
      if(activeTab === "event") document.getElementById("btnSubmitUEvent").click();
      else if(activeTab === "person") document.getElementById("btnSubmitUPerson").click();
      else if(activeTab === "article") document.getElementById("btnContinueArticle").click();
    });
  }

  const btnAuthBarAction = document.getElementById("btnAuthBarAction");
  if(btnAuthBarAction){
    btnAuthBarAction.addEventListener("click", () => {
      const stepEmail = document.getElementById("stepEmail");
      const stepCode = document.getElementById("stepCode");
      const stepProfile = document.getElementById("stepProfile");
      if(stepEmail && stepEmail.style.display !== "none") document.getElementById("btnSendCode").click();
      else if(stepCode && stepCode.style.display !== "none") document.getElementById("btnVerifyCode").click();
      else if(stepProfile && stepProfile.style.display !== "none") document.getElementById("btnSaveProfile").click();
    });
  }

  const btnAuth = document.getElementById("btnAuth");
  if(btnAuth){
    btnAuth.addEventListener("click", () => { resetAuthModal(); open_("authOverlay"); });
  }

  const fabAdd = document.getElementById("fabAdd");
  if(fabAdd){
    fabAdd.addEventListener("click", e => {
      e.stopPropagation();
      openAddModal();
    });
  }

  const addBtn = document.getElementById("addBtn");
  if(addBtn){
    addBtn.addEventListener("click", e => {
      e.stopPropagation();
      openAddModal();
    });
  }

  const navSearchBtn = document.getElementById("navSearchBtn");
  const searchEl = document.querySelector('input[type="search"], .search input, #personSearchInput, .ppl-search');
  if(navSearchBtn){
    if(searchEl){
      navSearchBtn.style.display = "grid";
      navSearchBtn.addEventListener("click", () => {
        searchEl.focus();
        searchEl.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else {
      navSearchBtn.style.display = "none";
    }
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

  document.addEventListener("click", e => {
    if(whoDropdown) whoDropdown.classList.remove("open");
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
    const bar = document.getElementById("btnAuthBarAction");
    const title = document.getElementById("authModalTitle");
    if(bar) bar.textContent = "Войти";
    if(title) title.textContent = "Код из письма";
  });

  document.getElementById("btnChangeEmail").addEventListener("click", () => {
    document.getElementById("errCode").style.display = "none";
    document.getElementById("stepCode").style.display = "none";
    document.getElementById("stepEmail").style.display = "block";
    const bar = document.getElementById("btnAuthBarAction");
    const title = document.getElementById("authModalTitle");
    if(bar) bar.textContent = "Код";
    if(title) title.textContent = "Войти";
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
      const bar = document.getElementById("btnAuthBarAction");
      const title = document.getElementById("authModalTitle");
      if(bar) bar.textContent = "Готово";
      if(title) title.textContent = "Профиль";
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



  if (sb && sb.auth) {
    sb.auth.onAuthStateChange(async (event, session) => {
      if(session && session.user){
        currentUser = session.user;
        const { data: profile } = await sb.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
        if(profile) onLoggedIn(profile);
      }
      // сигнал для других страниц (например moderation.html) — авторизация проверена, можно смотреть currentUser/myProfile
      window.dispatchEvent(new Event("authReady"));
    });
  } else {
    window.dispatchEvent(new Event("authReady"));
  }
}

// ---------- общие хелперы для статей "Наследия" (используются на nasledie.html и moderation.html) ----------
function escapeHtml(s){
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function escapeAttr(s){
  return String(s || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function formatDate(iso){
  if(!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" });
}

function formatSourceLink(s){
  if(!s) return "";
  s = String(s).trim();
  if(/^https?:\/\//i.test(s)){
    return `<a href="${escapeHtml(s)}" target="_blank" rel="noopener">${escapeHtml(s)}</a>`;
  }
  return escapeHtml(s);
}

// Гостю показывать всё, кроме e-mail (e-mail нигде не выводить)
function sanitizePublicName(name){
  if(!name) return "";
  let s = String(name).trim();
  if(s.includes("@")){
    const prefix = s.split("@")[0].trim();
    return prefix || "Участник";
  }
  return s;
}

// ---------- Универсальная иконка метаданных и поповер (Задача 4) ----------
const META_FIELD_NAMES = {
  // people
  full_name: "имя",
  gender: "пол",
  relation_type: "отношение к Т.И.",
  studied_choir_school: "училище им. Глинки",
  choir_school_start: "училище (начало)",
  choir_school_end: "выпуск училища",
  studied_conservatory: "консерватория",
  conservatory_start: "консерватория (начало)",
  conservatory_end: "выпуск консерватории",
  studied_assistantship: "ассистентура",
  assistantship_start: "ассистентура (начало)",
  assistantship_end: "окончание ассистентуры",
  study_start: "годы учёбы (начало)",
  study_end: "годы учёбы (окончание)",
  institution: "место работы",
  notes: "заметки",
  source: "источник",
  avatar_url: "фотография",
  verification_hidden: "видимость верификации",
  // events
  event_year: "год",
  title: "название",
  description: "описание",
  // articles
  type: "тип материала",
  author_type: "раздел авторства",
  author_name: "автор текста",
  original_year: "год первоисточника",
  content: "текст статьи",
  cover_image_url: "обложка"
};

window.__metaCache = window.__metaCache || new Map();

function renderMetaIcon(entity_type, entity_id, row){
  if(row){
    window.__metaCache.set(`${entity_type}:${entity_id}`, row);
  }
  return `<button type="button" class="meta-icon-btn" data-meta-type="${escapeAttr(entity_type)}" data-meta-id="${escapeAttr(entity_id)}" aria-label="Информация и история записи" title="Информация и история записи"><span class="sym">info</span></button>`;
}

let activeMetaBtn = null;
let metaHideTimer = null;
let metaShowTimer = null;

function ensureMetaPopover(){
  let pop = document.getElementById("globalMetaPopover");
  if(pop) return pop;
  pop = document.createElement("div");
  pop.id = "globalMetaPopover";
  pop.className = "meta-popover";
  pop.style.display = "none";
  pop.innerHTML = `
    <div class="meta-popover-header">
      <span class="meta-popover-title">О записи</span>
      <button type="button" class="meta-popover-close iconbtn" aria-label="Закрыть"><span class="sym">close</span></button>
    </div>
    <div class="meta-popover-body"></div>
  `;
  document.body.appendChild(pop);

  pop.querySelector(".meta-popover-close").addEventListener("click", () => hideMetaPopover());
  pop.addEventListener("mouseenter", () => clearTimeout(metaHideTimer));
  pop.addEventListener("mouseleave", () => {
    clearTimeout(metaHideTimer);
    metaHideTimer = setTimeout(hideMetaPopover, 250);
  });
  return pop;
}

function positionMetaPopover(pop, btn){
  const r = btn.getBoundingClientRect();
  const pr = pop.getBoundingClientRect();
  const padding = 10;

  let left = r.left + (r.width / 2) - (pr.width / 2);
  if(left + pr.width > window.innerWidth - padding){
    left = window.innerWidth - padding - pr.width;
  }
  if(left < padding) left = padding;

  let top = r.bottom + 6;
  if(top + pr.height > window.innerHeight - padding){
    const above = r.top - pr.height - 6;
    if(above >= padding) top = above;
  }

  pop.style.left = Math.round(left) + "px";
  pop.style.top = Math.round(top) + "px";
}

async function showMetaPopover(btn){
  clearTimeout(metaHideTimer);
  const type = btn.dataset.metaType;
  const id = btn.dataset.metaId;
  if(!type || !id) return;

  const pop = ensureMetaPopover();
  activeMetaBtn = btn;

  let row = window.__metaCache.get(`${type}:${id}`);
  if(!row && typeof sb !== "undefined"){
    const table = type === "person" ? "people" : type === "event" ? "events" : "articles";
    const { data } = await sb.from(table).select("*").eq("id", id).maybeSingle();
    if(data){
      row = data;
      window.__metaCache.set(`${type}:${id}`, row);
    }
  }

  const body = pop.querySelector(".meta-popover-body");

  const authorName = sanitizePublicName(row ? (row.created_by_name || "") : "");
  const authorDate = (row && row.created_at) ? formatDate(row.created_at) : "";
  const line1 = `<div class="meta-popover-row" id="metaRowLine1">Добавил(а): <b>${escapeHtml(authorName || "Архивная запись")}</b>${authorDate ? " · " + authorDate : ""}</div>`;

  let line2 = "";
  if(row){
    if(row.status === "unconfirmed" || row.status === "pending"){
      line2 = `<div class="meta-popover-row" style="color:var(--tertiary); font-weight:500">На проверке</div>`;
    } else if(row.status === "rejected"){
      const modName = sanitizePublicName(row.moderated_by_name || "");
      const modDate = row.moderated_at ? formatDate(row.moderated_at) : "";
      line2 = `<div class="meta-popover-row" style="color:var(--error)">Отклонено${modName ? " — " + escapeHtml(modName) : ""}${modDate ? " · " + modDate : ""}</div>`;
    } else {
      const modName = sanitizePublicName(row.moderated_by_name || row.confirmed_by_name || "модератор");
      const modDate = formatDate(row.moderated_at || row.confirmed_at);
      line2 = `<div class="meta-popover-row">Проверил(а): <b>${escapeHtml(modName)}</b>${modDate ? " · " + modDate : ""}</div>`;
    }
  }

  let line3 = "";
  if(row && row.source){
    line3 = `<div class="meta-popover-row">Источник: ${formatSourceLink(row.source)}</div>`;
  }

  body.innerHTML = `
    ${line1}
    ${line2}
    ${line3}
    <div class="meta-popover-history-sec">
      <div class="meta-popover-history-title">История изменений</div>
      <div class="meta-popover-history-content">
        <div style="color:var(--on-surface-variant); font-size:var(--fs-label-medium); font-style:italic">Загрузка истории…</div>
      </div>
    </div>
  `;

  pop.style.display = "block";
  positionMetaPopover(pop, btn);

  // Ленивая загрузка истории из revisions
  if(typeof sb !== "undefined"){
    try{
      const { data: revs, error } = await sb
        .from("revisions")
        .select("*")
        .eq("entity_type", type)
        .eq("entity_id", id)
        .in("status", ["applied", "rejected"])
        .order("created_at", { ascending: false });

      if(activeMetaBtn !== btn) return; // пользователь уже переключился на другую иконку

      const historyContent = pop.querySelector(".meta-popover-history-content");
      if(error){
        historyContent.innerHTML = `<div style="color:var(--error); font-size:var(--fs-label-medium)">Не удалось загрузить историю</div>`;
        return;
      }

      // Если в строке 1 не было автора (архивная запись без created_by_name), проверяем revisions на kind='create'
      if((!authorName || authorName === "Архивная запись") && revs){
        const createRev = revs.find(r => r.kind === "create");
        if(createRev){
          const l1El = pop.querySelector("#metaRowLine1");
          if(l1El){
            const cName = sanitizePublicName(createRev.author_name);
            const cDate = formatDate(createRev.created_at);
            l1El.innerHTML = `Добавил(а): <b>${escapeHtml(cName || "Пользователь")}</b>${cDate ? " · " + cDate : ""}`;
          }
        }
      }

      const updates = (revs || []).filter(r => r.kind === "update" || r.kind === "moderate");
      if(!updates.length){
        historyContent.innerHTML = `<div style="color:var(--on-surface-variant); font-size:var(--fs-label-medium); font-style:italic">Правок пока не было</div>`;
      } else {
        const listHtml = updates.map(r => {
          const d = formatDate(r.created_at);
          const who = sanitizePublicName(r.author_name || "Участник");
          if(r.kind === "update"){
            const changed = Object.keys(r.patch || {}).map(k => META_FIELD_NAMES[k] || k).join(", ");
            const comment = r.comment ? ` · <i>«${escapeHtml(r.comment)}»</i>` : "";
            const isRej = r.status === "rejected" ? ` <span style="color:var(--error); font-size:var(--fs-label-medium)">(отклонено)</span>` : "";
            return `
              <li class="m3-list-item" style="padding:6px 0; display:flex; align-items:flex-start; gap:8px;">
                <span class="sym" style="font-size:18px; color:var(--on-surface-variant); margin-top:2px; flex:none;">history</span>
                <div style="flex:1; min-width:0">
                  <div style="font-weight:500; font-size:var(--fs-body-medium); color:var(--on-surface)">${escapeHtml(who)} · ${d}</div>
                  <div style="font-size:var(--fs-label-medium); color:var(--on-surface-variant)">изменил(а): ${escapeHtml(changed || "данные")}${comment}${isRej}</div>
                </div>
              </li>
            `;
          } else if(r.kind === "moderate"){
            const action = (r.patch && r.patch.status === "confirmed") ? "подтверждение" : "отклонение";
            const note = (r.moderator_note || (r.patch && r.patch.note)) ? ` · <i>«${escapeHtml(r.moderator_note || r.patch.note)}»</i>` : "";
            return `
              <li class="m3-list-item" style="padding:6px 0; display:flex; align-items:flex-start; gap:8px;">
                <span class="sym" style="font-size:18px; color:var(--on-surface-variant); margin-top:2px; flex:none;">history</span>
                <div style="flex:1; min-width:0">
                  <div style="font-weight:500; font-size:var(--fs-body-medium); color:var(--on-surface)">${escapeHtml(who)} · ${d}</div>
                  <div style="font-size:var(--fs-label-medium); color:var(--on-surface-variant)">${action}${note}</div>
                </div>
              </li>
            `;
          }
          return "";
        }).join("");
        historyContent.innerHTML = `<ul class="meta-popover-history-list">${listHtml}</ul>`;
      }
      positionMetaPopover(pop, btn);
    } catch(e){
      console.error("Failed to load revision history:", e);
    }
  }
}

function hideMetaPopover(){
  clearTimeout(metaHideTimer);
  clearTimeout(metaShowTimer);
  const pop = document.getElementById("globalMetaPopover");
  if(pop) pop.style.display = "none";
  activeMetaBtn = null;
}

// Глобальные обработчики кликов и наведений для иконки метаданных
document.addEventListener("click", e => {
  const btn = e.target.closest(".meta-icon-btn");
  if(btn){
    e.preventDefault();
    e.stopPropagation();
    if(activeMetaBtn === btn){
      hideMetaPopover();
    } else {
      showMetaPopover(btn);
    }
    return;
  }
  const pop = document.getElementById("globalMetaPopover");
  if(pop && pop.style.display !== "none" && !e.target.closest("#globalMetaPopover")){
    hideMetaPopover();
  }
});

document.addEventListener("mouseover", e => {
  const btn = e.target.closest(".meta-icon-btn");
  if(btn){
    clearTimeout(metaHideTimer);
    clearTimeout(metaShowTimer);
    if(activeMetaBtn !== btn){
      metaShowTimer = setTimeout(() => showMetaPopover(btn), 200);
    }
  }
});

document.addEventListener("mouseout", e => {
  const btn = e.target.closest(".meta-icon-btn");
  if(btn){
    clearTimeout(metaShowTimer);
    clearTimeout(metaHideTimer);
    metaHideTimer = setTimeout(hideMetaPopover, 250);
  }
});

document.addEventListener("keydown", e => {
  if(e.key === "Escape"){
    hideMetaPopover();
    document.querySelectorAll(".overlay.open").forEach(ov => ov.classList.remove("open"));
    const whoDd = document.getElementById("whoDropdown");
    if(whoDd) whoDd.classList.remove("open");
  }
});

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeader);
} else {
  initHeader();
}
