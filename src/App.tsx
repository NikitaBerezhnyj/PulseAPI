import { useEffect, useState } from "react";
import Home from "./screens/Home";
import Workspace from "./screens/Workspace";
import { IScreen } from "./types/screens";
import "./App.css";
import { tryRestoreRecentFile } from "./api/file.api";

function App() {
  const [currentScreen, setCurrentScreen] = useState<IScreen | null>(null);

  useEffect(() => {
    tryRestoreRecentFile()
      .then(path => {
        setCurrentScreen(path ? "workspace" : "home");
      })
      .catch(() => {
        setCurrentScreen("home");
      });
  }, []);

  const handleFileLoaded = () => {
    setCurrentScreen("workspace");
  };

  const handleExitWorkspace = () => {
    setCurrentScreen("home");
  };

  if (currentScreen === null) {
    return null;
  }

  return (
    <main>
      {currentScreen === "home" && <Home onFileLoaded={handleFileLoaded} />}
      {currentScreen === "workspace" && <Workspace onExit={handleExitWorkspace} />}
    </main>
  );
}

export default App;
