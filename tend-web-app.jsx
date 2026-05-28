// tend-web-app.jsx — root of the responsive web app

function TendWebApp() {
  const [user, setUser] = useState(null);
  const isMobile = useIsMobile(820);
  if (!user) return <LoginScreen onLogin={setUser} />;
  return isMobile
    ? <MobileShell user={user} onLogout={() => setUser(null)} />
    : <DesktopShell user={user} onLogout={() => setUser(null)} />;
}

const webRoot = ReactDOM.createRoot(document.getElementById('root'));
webRoot.render(<TendWebApp />);
