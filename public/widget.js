/*
 * Record.me embed widget
 * --------------------------------------------------------------
 * Drop-in script that renders a clickable thumbnail / button which
 * opens any Record.me recording in a centred modal iframe.
 *
 * Usage A — automatic (recommended):
 *   <div data-recordme="SHARE_ID"
 *        data-title="My recording"
 *        data-button="Watch video"></div>
 *   <script async src="https://record-me-six.vercel.app/widget.js"></script>
 *
 * Usage B — programmatic:
 *   <script src="https://record-me-six.vercel.app/widget.js"></script>
 *   <script>RecordMe.open("SHARE_ID");</script>
 *
 * All styles are scoped / inline so the host page's CSS can't clobber them.
 * --------------------------------------------------------------
 */
(function () {
  if (window.__recordmeWidgetLoaded) return;
  window.__recordmeWidgetLoaded = true;

  var SCRIPT = document.currentScript;
  var ORIGIN = (function () {
    try {
      return SCRIPT && SCRIPT.src ? new URL(SCRIPT.src).origin : "https://record-me-six.vercel.app";
    } catch (_) {
      return "https://record-me-six.vercel.app";
    }
  })();

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "style") {
          for (var s in attrs.style) el.style[s] = attrs.style[s];
        } else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") {
          el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else {
          el.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children) {
      if (!Array.isArray(children)) children = [children];
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c == null) continue;
        el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    }
    return el;
  }

  function openModal(shareId, opts) {
    opts = opts || {};
    var overlay = h("div", {
      style: {
        position: "fixed",
        inset: "0",
        background: "rgba(0,0,0,0.82)",
        zIndex: "2147483647",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "recordme-fade 180ms ease-out",
      },
    });

    var box = h("div", {
      style: {
        position: "relative",
        width: "min(960px, 100%)",
        aspectRatio: "16 / 9",
        maxHeight: "90vh",
        background: "#000",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,.6)",
      },
    });

    var iframe = h("iframe", {
      src: ORIGIN + "/embed/" + encodeURIComponent(shareId),
      title: opts.title || "Record.me video",
      allow: "autoplay; fullscreen; picture-in-picture; clipboard-write",
      allowfullscreen: "true",
      style: {
        width: "100%",
        height: "100%",
        border: "0",
        display: "block",
      },
    });

    var close = h(
      "button",
      {
        "aria-label": "Close",
        onClick: dismiss,
        style: {
          position: "absolute",
          top: "8px",
          right: "8px",
          width: "36px",
          height: "36px",
          borderRadius: "999px",
          border: "0",
          background: "rgba(0,0,0,.7)",
          color: "#fff",
          fontSize: "18px",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        },
      },
      "×"
    );

    function dismiss() {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
    }
    function onKey(e) {
      if (e.key === "Escape") dismiss();
    }
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) dismiss();
    });
    document.addEventListener("keydown", onKey);

    box.appendChild(iframe);
    box.appendChild(close);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return dismiss;
  }

  function mount(el) {
    if (el.__recordmeMounted) return;
    el.__recordmeMounted = true;
    var shareId = el.getAttribute("data-recordme");
    var title = el.getAttribute("data-title") || "Watch recording";
    var label = el.getAttribute("data-button") || title;
    var btn = h(
      "button",
      {
        type: "button",
        onClick: function () {
          openModal(shareId, { title: title });
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          borderRadius: "999px",
          border: "0",
          background: "linear-gradient(135deg,#6366f1,#a855f7)",
          color: "#fff",
          font: "600 14px/1 system-ui,-apple-system,sans-serif",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(99,102,241,.35)",
        },
      },
      [
        (function () {
          var d = h("span", {
            style: {
              width: "8px",
              height: "8px",
              borderRadius: "999px",
              background: "#fff",
            },
          });
          return d;
        })(),
        label,
      ]
    );
    el.appendChild(btn);
  }

  function scan() {
    var nodes = document.querySelectorAll("[data-recordme]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  // Observe future insertions (SPAs)
  if (window.MutationObserver) {
    new MutationObserver(scan).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  window.RecordMe = {
    open: openModal,
    origin: ORIGIN,
  };
})();
