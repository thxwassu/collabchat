import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        about: resolve(root, "about.html"),
        features: resolve(root, "features.html"),
        contact: resolve(root, "contact.html"),
        login: resolve(root, "login.html"),
        register: resolve(root, "register.html"),
        dashboard: resolve(root, "dashboard.html"),
        workspaces: resolve(root, "workspaces.html"),
        workspace: resolve(root, "workspace.html"),
        chat: resolve(root, "chat.html"),
        privateChat: resolve(root, "private-chat.html"),
        tasks: resolve(root, "tasks.html"),
        files: resolve(root, "files.html"),
        notifications: resolve(root, "notifications.html"),
        profile: resolve(root, "profile.html"),

        adminLogin: resolve(root, "admin/login.html"),
        adminDashboard: resolve(root, "admin/dashboard.html"),
        adminUsers: resolve(root, "admin/users.html"),
        adminWorkspaces: resolve(root, "admin/workspaces.html"),
        adminMessages: resolve(root, "admin/messages.html"),
        adminFiles: resolve(root, "admin/files.html")
      }
    }
  }
});