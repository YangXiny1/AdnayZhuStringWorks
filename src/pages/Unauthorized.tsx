import { Link } from "react-router-dom";

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg border border-white/10 rounded-3xl p-10 text-center">
        <h1 className="text-4xl font-bold mb-4">Unauthorized</h1>
        <p className="opacity-70 mb-8">
          您没有权限访问此页面。只有管理员可以访问上传功能。
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link className="px-6 py-3 border border-white/10 rounded-xl" to="/">
            Go Home
          </Link>
          <Link className="px-6 py-3 bg-white text-black rounded-xl" to="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
