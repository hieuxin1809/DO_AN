import React from "react";
import ReactDOM from "react-dom";
import Apps from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

/* ─────────────────────────────────────────────────────────
 * Global error handlers
 * "Script error." (không có message/filename) là lỗi cross-origin
 * từ script bên ngoài (PayPal CDN, SockJS, v.v.) — browser giấu detail
 * vì CORS. Suppress để tránh React error overlay popup.
 *
 * Cần override 3 chỗ:
 *   1. window.onerror (legacy, react-error-overlay hook ở đây)
 *   2. window.addEventListener('error') capture phase
 *   3. unhandledrejection
 * ──────────────────────────────────────────────────────── */
const isBenignScriptError = (msgOrEvent, src) => {
    const msg = (typeof msgOrEvent === 'string' ? msgOrEvent : msgOrEvent?.message) || '';
    const filename = src || msgOrEvent?.filename || '';
    return (
        msg === 'Script error.' ||
        msg === 'Script error' ||
        msg === 'ResizeObserver loop limit exceeded' ||
        msg === 'ResizeObserver loop completed with undelivered notifications.' ||
        (!msg && !filename)
    );
};

// 1) Override window.onerror — react-error-overlay đọc cái này
const _origOnError = window.onerror;
window.onerror = function (message, source, lineno, colno, error) {
    if (isBenignScriptError(message, source)) {
        console.warn('[suppressed cross-origin script error]', { message, source });
        return true; // true = đánh dấu đã handle, không propagate
    }
    if (typeof _origOnError === 'function') {
        return _origOnError.apply(this, arguments);
    }
    return false;
};

// 2) Capture phase listener — chặn trước khi đến react-error-overlay
window.addEventListener('error', (event) => {
    if (isBenignScriptError(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        return false;
    }
}, true);

// 3) Unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
    console.warn('[unhandled promise rejection]', event?.reason);
    // Không suppress để vẫn debug được lỗi promise thật
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <React.StrictMode>
  <Apps />,
  // </React.StrictMode>
);
reportWebVitals();
