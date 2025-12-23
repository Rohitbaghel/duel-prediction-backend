// src/app.ts
import express, { type Express } from "express"
import cors from "cors"
import morgan from "morgan"
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve static files from the React app
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// API routes would go here before the catch-all

// Catch all handler: send back React's index.html file for SPA routing
app.get("*", (_req, res) => {
	res.sendFile(path.join(publicPath, "index.html"));
});

export default app
