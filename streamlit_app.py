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
  </style>

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js"
          integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L"
          crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"
          integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm"
          crossorigin="anonymous"></script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"
          integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y"
          crossorigin="anonymous"></script>
</head>
<body>
  <div id="root"></div>
  {scripts}
</body>
</html>"""

# Use a large height — the CSS above forces the iframe to fill 100vh anyway
components.html(html, height=1000, scrolling=False)
