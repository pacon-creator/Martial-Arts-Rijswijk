const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
}

document.querySelectorAll("[data-booking-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    const button = form.querySelector("button[type='submit']");
    if (button) {
      button.textContent = "Bezig met boeken...";
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "trial_booking_form_submit" });
  });
});

document.querySelectorAll("[data-track='whatsapp_click']").forEach((link) => {
  link.addEventListener("click", () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "whatsapp_click" });
  });
});

if (location.pathname.endsWith("bedankt.html")) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "thank_you_page_view" });
}

/* =============================================
   LANGUAGE SWITCHER
   ============================================= */
(function () {
  var stored = localStorage.getItem('lang');
  var isEnPage = window.location.pathname.indexOf('/en/') === 0 ||
                 window.location.pathname.indexOf('/en') === 0 && window.location.pathname.length <= 4;

  if (!stored && !isEnPage && window.location.protocol !== 'file:') {
    var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('en')) {
      localStorage.setItem('lang', 'en');
      var enPath = '/en' + window.location.pathname;
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        enPath = '/en/index.html';
      }
      window.location.replace(enPath);
    }
  }

  if (stored === 'en' && !isEnPage) {
  }

  var switchers = document.querySelectorAll('.lang-switch a[data-lang]');
  switchers.forEach(function (el) {
    var lang = el.getAttribute('data-lang');
    if ((lang === 'en' && isEnPage) || (lang === 'nl' && !isEnPage)) {
      el.classList.add('active');
    }
  });

  switchers.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var lang = el.getAttribute('data-lang');
      localStorage.setItem('lang', lang);
      window.location.href = el.getAttribute('href');
    });
  });
})();

/* =============================================
   SCROLL REVEAL - IntersectionObserver
   ============================================= */
(function () {
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq && mq.matches) return;

  var targets = document.querySelectorAll('[data-reveal], [data-reveal-stagger]');
  if (!targets.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  targets.forEach(function (el) {
    observer.observe(el);
  });
})();
