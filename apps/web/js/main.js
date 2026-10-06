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

  // Beta sign-up form (prototype: validates and shows a message, no network call yet).
  // When the backend is ready, POST to `${API_URL}/beta-signups` here.
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
      status.textContent = 'Tack! Vi hör av oss när betan öppnar.';
      form.reset();
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
