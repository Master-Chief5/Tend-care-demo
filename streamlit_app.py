import os
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="Tend · care ops",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Hide all Streamlit chrome so the app fills the viewport
st.markdown("""
<style>
  /* Hide header, footer, deploy button, sidebar toggle */
  #MainMenu { visibility: hidden; }
  header[data-testid="stHeader"] { display: none; }
  footer { visibility: hidden; }
  .stDeployButton { display: none; }

  /* Remove all padding from the main container */
  .block-container {
    padding: 0 !important;
    max-width: 100% !important;
  }
  [data-testid="stAppViewContainer"] { padding: 0; }
  [data-testid="stVerticalBlock"] { gap: 0 !important; padding: 0 !important; }

  /* Make the iframe fill the full viewport */
  iframe {
    width: 100% !important;
    height: 100vh !important;
    border: none !important;
    display: block !important;
  }
</style>
""", unsafe_allow_html=True)

BASE = os.path.dirname(os.path.abspath(__file__))

def read(filename):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        return f"// {filename} not found\n"
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

css = read("styles.css")

JSX_ORDER = [
    "common.jsx",
    "screens-login.jsx",
    "screens-a-houses.jsx",
    "screens-a-house-detail.jsx",
    "screens-a-resources.jsx",
    "screens-a-schedule.jsx",
    "screens-a-schedule-day.jsx",
    "screens-a-driving.jsx",
    "screens-a-people.jsx",
    "screens-a-onboard-chat.jsx",
    "screens-a-employee.jsx",
    "desktop.jsx",
    "tend-web.jsx",
    "tend-web-desktop-pages.jsx",
    "tend-web-desktop-schedule.jsx",
    "tend-web-app.jsx",
]

scripts = "\n".join(
    f'<script type="text/babel">\n{read(f)}\n</script>'
    for f in JSX_ORDER
)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Tend · care ops</title>

  <style>
    {css}
    html, body, #root {{ height: 100%; margin: 0; }}
    body {{ overflow: hidden; background: var(--a-bg); }}
    * {{ box-sizing: border-box; }}
    ::-webkit-scrollbar {{ width: 10px; height: 10px; }}
    ::-webkit-scrollbar-track {{ background: transparent; }}
    ::-webkit-scrollbar-thumb {{ background: #d8ccb1; border-radius: 999px; border: 2px solid var(--a-bg); }}
    ::-webkit-scrollbar-thumb:hover {{ background: #c0b291; }}
    #tend-loading {{
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: var(--a-bg); font-family: Geist, system-ui, sans-serif;
      font-size: 14px; color: var(--a-ink3); letter-spacing: 0.02em;
    }}
    #tend-error {{
      position: fixed; inset: 0; overflow: auto;
      background: #fff8f6; font-family: monospace; font-size: 12px;
      color: #a93a25; padding: 24px; white-space: pre-wrap; line-height: 1.5;
    }}
  </style>

  <!-- jsDelivr CDN — production builds for faster/smaller loading -->
  <script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.23.10/babel.min.js" crossorigin="anonymous"></script>
</head>
<body>
  <div id="root">
    <div id="tend-loading">Loading Tend…</div>
  </div>

  <!-- Catch JS errors and display them visibly for debugging -->
  <script>
    window.onerror = function(msg, src, line, col, err) {{
      var root = document.getElementById('root');
      if (root) {{
        root.innerHTML = '<div id="tend-error">JS Error: ' + msg +
          '\\n\\nSource: ' + (src || 'unknown') + ':' + line +
          (err && err.stack ? '\\n\\n' + err.stack : '') + '</div>';
      }}
    }};
  </script>

  {scripts}
</body>
</html>"""

# Height is overridden to 100vh by the outer Streamlit CSS; use a generous value
components.html(html, height=900, scrolling=False)
