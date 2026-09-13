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
      <button class="add-link" id="addBtn">+ Добавить материал</button>
      <div class="dropdown" id="addDropdown">
        <button class="opt" id="optEvent">
          <div class="t">Событие на линию жизни</div>
          <div class="d">Дата, место, что произошло — появится на таймлайне</div>
        </button>
        <a class="opt" href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Материал для сайта памяти Т.И. Хитровой")}">
          <div class="t">Написать на почту</div>
          <div class="d">Фото, статья, воспоминание — что угодно, на ${CONTACT_EMAIL}</div>
        </a>
      </div>
    </div>
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

<div class="overlay" id="addOverlay">
  <div class="modal">
    <button class="close" data-close>×</button>
    <h2>Добавить событие на таймлайн</h2>
    <label>Год</label>
    <input type="number" id="evYear" placeholder="например, 1962" min="1940" max="2026">
    <label>Что произошло</label>
    <input type="text" id="evTitle" placeholder="Короткое название события">
    <label>Подробности (необязательно)</label>
    <textarea id="evDesc" placeholder="Пара предложений — что было, откуда вам это известно"></textarea>
    <label>Источник / ссылка</label>
    <input type="text" id="evSource" placeholder="Фото афиши, ссылка на статью, чьи слова и т.п.">
    <div class="err" id="errEvent"></div>
    <div class="hint">Источник обязателен — так читатели видят, откуда факт, а не просто «кто-то сказал». Появится на таймлайне с пометкой «не подтверждено», пока модератор не проверит.</div>
    <div class="row-actions"><button class="primary" id="btnSubmitEvent">Отправить</button></div>
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

  if(profile.is_moderator) document.getElementById("modLink").style.display = "block";
}

function initHeader(){
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
  const dropdown = document.getElementById("addDropdown");
  addBtn.addEventListener("click", e => { e.stopPropagation(); dropdown.classList.toggle("open"); addBtn.classList.toggle("open"); });
  document.getElementById("optEvent").addEventListener("click", e => {
    e.stopPropagation();
    dropdown.classList.remove("open");
    if(!currentUser){ resetAuthModal(); open_("authOverlay"); return; }
    open_("addOverlay");
  });

  const whoChip = document.getElementById("whoChip");
  const whoDropdown = document.getElementById("whoDropdown");
  whoChip.addEventListener("click", e => { e.stopPropagation(); whoDropdown.classList.toggle("open"); });
  document.getElementById("btnLogout").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });

  // бургер — на мобильном открывает панель с "добавить материал" / "войти"
  const burgerBtn = document.getElementById("burgerBtn");
  const navRight = document.querySelector(".nav-right");
  burgerBtn.addEventListener("click", e => { e.stopPropagation(); navRight.classList.toggle("open"); });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open"); addBtn.classList.remove("open");
    whoDropdown.classList.remove("open");
    navRight.classList.remove("open");
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

  document.getElementById("btnSubmitEvent").addEventListener("click", async () => {
    const event_year = parseInt(document.getElementById("evYear").value, 10);
    const title = document.getElementById("evTitle").value.trim();
    const description = document.getElementById("evDesc").value.trim();
    const source = document.getElementById("evSource").value.trim();
    const errEl = document.getElementById("errEvent");
    if(!event_year || !title){ errEl.textContent = "Заполните год и название"; errEl.style.display = "block"; return; }
    if(!source){ errEl.textContent = "Укажите источник — без него факт не примут"; errEl.style.display = "block"; return; }
    errEl.style.display = "none";
    const { error } = await sb.from("events").insert({
      event_year, title, description, source, created_by: currentUser.id, created_by_name: myProfile.full_name
    });
    if(error){ errEl.textContent = error.message; errEl.style.display = "block"; return; }
    close_("addOverlay");
    document.getElementById("evYear").value = "";
    document.getElementById("evTitle").value = "";
    document.getElementById("evDesc").value = "";
    document.getElementById("evSource").value = "";
    if(typeof window.onEventAdded === "function") window.onEventAdded();
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

document.addEventListener("DOMContentLoaded", initHeader);
