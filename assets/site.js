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
  var storage = {
    get: function () { return null; },
    set: function () {}
  };

  try {
    storage.get = function () { return localStorage.getItem('lang'); };
    storage.set = function (value) { localStorage.setItem('lang', value); };
  } catch (error) {}

  var stored = storage.get();
  var isEnPage = window.location.pathname.indexOf('/en/') === 0 ||
                 window.location.pathname.indexOf('/en') === 0 && window.location.pathname.length <= 4;

  if (!stored && !isEnPage && window.location.protocol !== 'file:') {
    var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('en')) {
      storage.set('en');
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
      storage.set(lang);
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
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal], [data-reveal-stagger]').forEach(function (el) {
      el.classList.add('revealed');
    });
    return;
  }

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

/* =============================================
   PREMIUM MOTION ORCHESTRATION
   ============================================= */
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.querySelector('.site-header');
  document.body.classList.add('motion-boot');

  function setReady() {
    document.body.classList.add('motion-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setReady);
  } else {
    setReady();
  }

  if (header) {
    var ticking = false;
    var updateHeader = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    };

    updateHeader();
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  }

  if (!reduceMotion) {
    document.querySelectorAll('[data-reveal-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, index) {
        child.style.transitionDelay = Math.min(index * 70, 560) + 'ms';
      });
    });
  }

  document.addEventListener('click', function (event) {
    if (reduceMotion || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    if (
      !href ||
      href.charAt(0) === '#' ||
      href.indexOf('tel:') === 0 ||
      href.indexOf('mailto:') === 0 ||
      link.target === '_blank' ||
      link.hasAttribute('download')
    ) {
      return;
    }

    var destination;
    try {
      destination = new URL(href, window.location.href);
    } catch (error) {
      return;
    }

    if (destination.origin !== window.location.origin || destination.href === window.location.href) return;

    event.preventDefault();
    document.body.classList.add('page-leaving');
    window.setTimeout(function () {
      window.location.href = destination.href;
    }, 180);
  });

  window.addEventListener('pageshow', function () {
    document.body.classList.remove('page-leaving');
    document.body.classList.add('motion-ready');
  });
})();
