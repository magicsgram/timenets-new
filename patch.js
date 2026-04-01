const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const insertionPoint = '  useProjectPersistence(project, storageKey);';
const newCode =   useProjectPersistence(project, storageKey);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    if (themeParam === 'dark' || themeParam === 'light') {
      setTheme(themeParam as 'dark' | 'light');
    }

    const demoParam = params.get('demo');
    if (demoParam) {
      fetchDemoEntries().then((entries) => {
        const demo = entries.find((e) => e.id === demoParam);
        if (demo) {
          fetchDemoProject(demo).then((proj) => {
            setProjectAndSync(proj, \Loaded \.\);
          });
        } else {
          setProjectAndSync(emptyProject, 'Invalid demo.');
        }
      }).catch(() => {
        setProjectAndSync(emptyProject, 'Error loading demos.');
      });
    }
  }, []);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    const url = new URL(window.location.href);
    url.searchParams.set('theme', newTheme);
    window.history.replaceState({}, '', url.toString());
  };
;

app = app.replace(insertionPoint, newCode);

app = app.replace('onThemeChange={setTheme}', 'onThemeChange={handleThemeChange}');

const demoLoadPoint = 'onLoadDemo={(project) => setProjectAndSync(project, Loaded .)}';
const demoLoadNew = onLoadDemo={(project, demoId) => {
            setProjectAndSync(project, \Loaded \.\);
            const url = new URL(window.location.href);
            url.searchParams.set('demo', demoId);
            window.history.pushState({}, '', url.toString());
          }};
          
app = app.replace(demoLoadPoint, demoLoadNew);

fs.writeFileSync('src/App.tsx', app);
