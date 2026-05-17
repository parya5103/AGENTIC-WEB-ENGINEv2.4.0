import express from "express";
import dotenv from "dotenv";
import { companyApp } from "./graph/companyGraph.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post("/api/task", async (req, res) => {
  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task is required" });
  }

  try {
    const initialState = { task };
    // Wait for the multi-agent graph to finish execution
    const result = await companyApp.invoke(initialState);
    res.json({ result });
  } catch (error) {
    console.error("Error executing agent workflow:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
