import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { initializeStore } from "./store";

initializeStore();

createRoot(document.getElementById("root")!).render(<App />);
