import mongoose from "mongoose";

const recurrenceSchema = new mongoose.Schema(
  {
    frequency: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none"
    },
    interval: { type: Number, default: 1, min: 1 }
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    dueDate: { type: Date },
    estimatedMinutes: { type: Number, min: 1 },
    tags: { type: [String], default: [] },
    recurrence: { type: recurrenceSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);
