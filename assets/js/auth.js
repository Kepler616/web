(function() {
  // Configuration
  const AUTH_API_BASE_URL = "https://demo-auth-worker.kenport.workers.dev";
  const AUTH_TOKEN_KEY = "demoAuthToken";

  // Global exports
  window.AUTH_API_BASE_URL = AUTH_API_BASE_URL;

  window.getAuthToken = function() {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) || "";
    } catch (error) {
      return "";
    }
  };

  window.setAuthToken = function(token) {
    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (error) {
      console.error("Error setting token", error);
    }
  };

  window.authFetch = function(path, options) {
    var opts = options || {};
    var headers = opts.headers || {};
    var token = window.getAuthToken();
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    opts.headers = headers;
    return fetch(AUTH_API_BASE_URL + path, opts);
  };

  window.updateAuthNav = function(username, role) {
    var buttons = document.querySelectorAll("[data-auth-nav=\"true\"]");
    if (!buttons.length) return;

    var isAdmin = role === "admin";
    
    // Iterate over NodeList compatibly
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var labelSpan = btn.querySelector(".nav-demo-label");
      if (!labelSpan) continue;

      var isEs = btn.classList.contains("lang-es");
      var logoutText = isEs ? "Cerrar sesión" : "Logout";

      // Check for dynamic logout button
      var logoutBtn = btn.nextElementSibling;
      var hasLogout = logoutBtn && logoutBtn.classList.contains("auth-logout-dynamic");

      if (username) {
        // --- LOGGED IN ---
        btn.classList.add("logged-in");
        
        if (isAdmin) {
            labelSpan.textContent = "Dashboard";
            var href = btn.getAttribute("href") || "";
            if (href.indexOf("login.html") !== -1) {
                btn.setAttribute("href", href.replace("login.html", "admin-dashboard.html"));
            } else if (href.indexOf("user-dashboard.html") !== -1) {
                btn.setAttribute("href", href.replace("user-dashboard.html", "admin-dashboard.html"));
            }
        } else {
            labelSpan.textContent = username;
            var hrefUser = btn.getAttribute("href") || "";
            if (hrefUser.indexOf("admin-dashboard.html") !== -1) {
                btn.setAttribute("href", hrefUser.replace("admin-dashboard.html", "user-dashboard.html"));
            } else if (hrefUser.indexOf("login.html") !== -1) {
                btn.setAttribute("href", hrefUser.replace("login.html", "user-dashboard.html"));
            }
        }

        // Ensure Logout Button Exists
        if (!hasLogout) {
            logoutBtn = document.createElement("a");
            logoutBtn.href = "#";
            logoutBtn.className = "auth-logout-btn auth-logout-dynamic";
            if (isEs) logoutBtn.classList.add("lang-es");
            else logoutBtn.classList.add("lang-en");
            
            logoutBtn.onclick = function(e) {
                e.preventDefault();
                window.setAuthToken("");
                window.location.href = "login.html";
            };
            btn.parentNode.insertBefore(logoutBtn, btn.nextSibling);
        }
        logoutBtn.textContent = logoutText;

      } else {
        // --- LOGGED OUT ---
        btn.classList.remove("logged-in");

        if (isEs) {
          labelSpan.textContent = "Crear cuenta";
        } else {
          labelSpan.textContent = "Create account";
        }
        var hrefDefault = btn.getAttribute("href") || "";
        if (hrefDefault.indexOf("admin-dashboard.html") !== -1) {
          btn.setAttribute("href", hrefDefault.replace("admin-dashboard.html", "login.html"));
        } else if (hrefDefault.indexOf("user-dashboard.html") !== -1) {
          btn.setAttribute("href", hrefDefault.replace("user-dashboard.html", "login.html"));
        }

        // Remove Logout Button
        if (hasLogout) {
            logoutBtn.remove();
        }
      }
    }
  };

  // Check session on load
  function fetchGlobalSession() {
    window.authFetch("/api/auth/me", { method: "GET" })
      .then(function(response) {
        if (response.ok) return response.json();
        throw new Error("No session");
      })
      .then(function(body) {
        if (body.username) {
            window.updateAuthNav(body.username, body.role || "user");
            // Dispatch event for other scripts (e.g. login.html or snake)
            // Use CustomEvent if available
            if (typeof CustomEvent === "function") {
                window.dispatchEvent(new CustomEvent("auth:login", { detail: body }));
            }
        } else {
            window.updateAuthNav("", "");
            if (typeof CustomEvent === "function") {
                window.dispatchEvent(new CustomEvent("auth:logout"));
            }
        }
      })
      .catch(function() {
        window.updateAuthNav("", "");
        if (typeof CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("auth:logout"));
        }
      });
  }

  // Run on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchGlobalSession);
  } else {
    fetchGlobalSession();
  }
})();
