import { open } from "@tauri-apps/api/dialog";
import { loadHttpFile } from "../api/file.api";
import { log } from "../api/log.api";
import styles from "../styles/screens/Home.module.css";
import { getRandomSubtitle } from "../utils/randomSubtitle";
import { HeartPulse } from "lucide-react";

interface HomeProps {
  onFileLoaded: () => void;
}

function Home({ onFileLoaded }: HomeProps) {
  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "HTTP files",
            extensions: ["http"]
          }
        ]
      });

      if (!selected || Array.isArray(selected)) return;

      await loadHttpFile(selected);

      setTimeout(() => {
        onFileLoaded();
      }, 100);
    } catch (error) {
      log(`Failed to load file: ${error}`, "error");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.title}>
          <HeartPulse size={32} />
          <h1>PulseAPI</h1>
        </div>
        <p className={styles.subtitle}>{getRandomSubtitle()}</p>
        <button className={styles.openButton} onClick={handleOpenFile}>
          Open .http file
        </button>
      </div>
    </div>
  );
}

export default Home;
