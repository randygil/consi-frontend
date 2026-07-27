/*!
 * Consi.js — embeddable hosted-checkout drop-in and custom secure Elements.
 *
 * Usage on a merchant site:
 *   <script src="https://pay.consi.example/consi.js"></script>
 *   <script>
 *     // SDK Modal Mode
 *     Consi.checkout({ token: 'demo-link', onSuccess: () => location.reload() });
 *
 *     // Elements Custom Iframe Mode
 *     const elements = Consi.elements({ style: { color: '#000' } });
 *     const card = elements.create('card');
 *     card.mount('#card-container');
 *   </script>
 *
 * Opens the hosted checkout (/c/{token}) in a centered modal iframe, or mounts custom elements.
 * No dependencies.
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

  function elements(options) {
    options = options || {};

    function create(type, elementOptions) {
      if (type !== 'card') {
        throw new Error("Consi.elements: Only type 'card' is supported.");
      }
      elementOptions = elementOptions || {};

      var container = null;
      var iframe = null;
      var onChangeHandler = null;
      var onTokenSuccess = null;
      var onTokenError = null;

      function mount(selector) {
        var el = document.querySelector(selector);
        if (!el) throw new Error("Consi Elements: Mount target '" + selector + "' not found");
        container = el;

        iframe = document.createElement('iframe');
        var mergedStyle = Object.assign({}, options.style || {}, elementOptions.style || {});
        var styleParam = encodeURIComponent(JSON.stringify(mergedStyle));
        iframe.src = ORIGIN + '/elements/card?style=' + styleParam;
        iframe.style.cssText = 'width:100%;height:220px;border:0;background:transparent;overflow:hidden;';
        iframe.setAttribute('title', 'Secure Card Input');

        container.appendChild(iframe);

        function handleMessage(e) {
          if (e.origin !== ORIGIN) return;
          if (e.data.type === 'consi:elements_change') {
            if (typeof onChangeHandler === 'function') {
              onChangeHandler(e.data);
            }
          } else if (e.data.type === 'consi:elements_token_success') {
            if (typeof onTokenSuccess === 'function') {
              onTokenSuccess(e.data.token);
            }
          } else if (e.data.type === 'consi:elements_token_error') {
            if (typeof onTokenError === 'function') {
              onTokenError(e.data.error);
            }
          }
        }

        window.addEventListener('message', handleMessage);

        return {
          unmount: function() {
            if (iframe && iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
            window.removeEventListener('message', handleMessage);
          }
        };
      }

      function on(event, handler) {
        if (event === 'change') {
          onChangeHandler = handler;
        }
      }

      function tokenize() {
        return new Promise(function(resolve, reject) {
          if (!iframe) {
            reject(new Error("Consi Elements: Element is not mounted yet"));
            return;
          }

          onTokenSuccess = function(token) {
            resolve({ token: token });
            onTokenSuccess = null;
            onTokenError = null;
          };

          onTokenError = function(err) {
            resolve({ error: err });
            onTokenSuccess = null;
            onTokenError = null;
          };

          iframe.contentWindow.postMessage({ type: 'consi:elements_tokenize' }, ORIGIN);
        });
      }

      return {
        mount: mount,
        on: on,
        tokenize: tokenize
      };
    }

    return {
      create: create
    };
  }

  global.Consi = {
    checkout: checkout,
    elements: elements
  };
})(window);
