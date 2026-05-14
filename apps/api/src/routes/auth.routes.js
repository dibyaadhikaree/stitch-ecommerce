import { Router } from "express";

import { env } from "../config/env.js";
import { createToken, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};

  if (email !== env.adminEmail || password !== env.adminPassword) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }

  const admin = {
    name: "STITCH Admin",
    email: env.adminEmail,
    role: "owner",
  };

  const token = createToken(admin);
  return res.json({ token, admin });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({
    admin: {
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
