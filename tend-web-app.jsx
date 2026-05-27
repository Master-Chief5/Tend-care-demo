// tend-web-app.jsx — root of the responsive web app

function TendWebApp() {
  const isMobile = useIsMobile(820);
  return isMobile ? <MobileShell /> : <DesktopShell />;
}

const webRoot = ReactDOM.createRoot(document.getElementById('root'));
webRoot.render(<TendWebApp />);
