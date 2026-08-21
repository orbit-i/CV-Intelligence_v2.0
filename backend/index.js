require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const app = express();
const prisma = new PrismaClient({ adapter });

app.use(express.json());

app.get("/jobs", async (req, res) => {
  try {
    const jobs = await prisma.job.findMany();
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/jobs", async (req, res) => {
  try {
    const { title, department, location, description, status } = req.body;
    const job = await prisma.job.create({
      data: { title, department, location, description, status },
    });
    res.status(201).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/jobs/:id", async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.put("/jobs/:id", async (req, res) => {
  try {
    const { title, department, location, description, status } = req.body;
    const job = await prisma.job.update({
      where: { id: Number(req.params.id) },
      data: { title, department, location, description, status },
    });
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/jobs/:id", async (req, res) => {
  try {
    await prisma.job.delete({
      where: { id: Number(req.params.id) },
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});