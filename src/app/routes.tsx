import { createBrowserRouter } from "react-router-dom";
import { Home } from "./components/Home";
import { VideoDetail } from "./components/VideoDetail";
import { Upload } from "./components/Upload";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { Unauthorized } from "../pages/Unauthorized";
import { AdminRoute } from "../components/AdminRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/video/:id",
    Component: VideoDetail,
  },
  {
    path: "/upload",
    Component: () => (
      <AdminRoute>
        <Upload />
      </AdminRoute>
    ),
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/unauthorized",
    Component: Unauthorized,
  },
]);
