/*!
 * Consi.js — embeddable hosted-checkout drop-in.
 *
 * Usage on a merchant site:
 *   <script src="https://pay.consi.example/consi.js"></script>
 *   <script>
 *     Consi.checkout({ token: 'demo-link', onSuccess: () => location.reload() });
 *   </script>
 *
 * Opens the hosted checkout (/c/{token}) in a centered modal iframe — the
 * Stripe-Elements-style drop-in. No dependencies.
 */
(function (global) {
  'use strict';

  // Origin that serves the checkout. Defaults to where consi.js is hosted.
  function baseOrigin() {
    var s = document.currentScript;
    if (s && s.src) {
      try {
        return new URL(s.src).origin;
      } catch (e) {
        /* fall through */
      }
    }
    return global.location.origin;
  }

  var ORIGIN = baseOrigin();

  function checkout(opts) {
    opts = opts || {};
    if (!opts.token) throw new Error('Consi.checkout: { token } is required');

    var overlay = document.createElement('div');
    overlay.setAttribute('data-consi-overlay', '');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:rgba(11,14,20,.55);' +
      'display:flex;align-items:center;justify-content:center;padding:16px;' +
      'opacity:0;transition:opacity .2s ease;';

    var frame = document.createElement('iframe');
    frame.src = ORIGIN + '/c/' + encodeURIComponent(opts.token) + '?embed=1';
    frame.style.cssText =
      'width:100%;max-width:440px;height:min(640px,92vh);border:0;border-radius:20px;' +
      'box-shadow:0 16px 40px rgba(16,24,40,.24);background:#fff;';
    frame.setAttribute('title', 'Consi Checkout');

    function close() {
      overlay.style.opacity = '0';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
      window.removeEventListener('message', onMessage);
    }

    function onMessage(ev) {
      if (ev.origin !== ORIGIN || !ev.data) return;
      if (ev.data.type === 'consi:paid') {
        if (typeof opts.onSuccess === 'function') opts.onSuccess(ev.data);
        setTimeout(close, 1200);
      } else if (ev.data.type === 'consi:close') {
        if (typeof opts.onClose === 'function') opts.onClose();
        close();
      }
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    window.addEventListener('message', onMessage);

    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
    });

    return { close: close };
  }

  global.Consi = { checkout: checkout };
})(window);
