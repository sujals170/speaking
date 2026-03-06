import express from "express";

import Task from "../models/Task.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId }).sort({ dueDate: 1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to load tasks" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, dueDate, priority, tags, recurrence, estimatedMinutes } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const task = await Task.create({
      userId: req.userId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || "medium",
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
      tags: Array.isArray(tags) ? tags : [],
      recurrence: recurrence || { frequency: "none", interval: 1 }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to create task" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }

    if (updates.estimatedMinutes) {
      updates.estimatedMinutes = Number(updates.estimatedMinutes);
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to update task" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task" });
  }
});

router.patch("/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.completed = !task.completed;
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle task" });
  }
});

export default router;
