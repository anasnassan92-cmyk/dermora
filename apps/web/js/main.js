/* Dermora landing page – small, dependency-free interactions. */
(function () {
  'use strict';

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Stäng meny' : 'Öppna meny');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Beta sign-up form → saved by the Dermora server (POST api/beta). On static hosting
  // without the server (GitHub Pages) the request fails and we still thank the visitor.
  var form = document.querySelector('[data-beta-form]');
  var status = document.querySelector('[data-beta-status]');
  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type="email"]').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = 'Kontrollera e-postadressen.';
        return;
      }
      status.textContent = 'Skickar …';
      fetch('api/beta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
        .catch(function () { return null; })
        .then(function () {
          status.textContent = 'Tack! Vi hör av oss när betan öppnar.';
          form.reset();
        });
    });
  }

  // Only one FAQ item open at a time
  var faqs = document.querySelectorAll('.faq details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
})();

// Logo → top of the page (the sticky header carries no anchor, so a plain #top would not move).
document.querySelectorAll('[data-scroll-top]').forEach(function (el) {
  el.addEventListener('click', function (e) {
    e.preventDefault();
    // Instant jump: smooth scrolling over a long page is unreliable on some phones.
    var root = document.documentElement, prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  });
});
