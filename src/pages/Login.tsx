import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // 根据输入判断是用户名还是邮箱
    const queryField = identifier.includes("@") ? "email" : "username";
    
    // 查询用户
    const { data: user, error: queryError } = await supabase
      .from("profiles")
      .select("id, username, email, role, password")
      .eq(queryField, identifier)
      .maybeSingle();

    if (queryError || !user) {
      setError("用户名或密码错误。");
      setLoading(false);
      return;
    }

    // 验证密码
    if (user.password !== password) {
      setError("用户名或密码错误。");
      setLoading(false);
      return;
    }

    // 登录成功，保存用户信息到 localStorage
    localStorage.setItem("user", JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }));

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md border border-white/10 rounded-3xl p-10">
        <h1 className="text-3xl font-bold mb-6">Login</h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm uppercase tracking-[0.25em] opacity-60 mb-2">
              Username or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="username or your@email.com"
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm uppercase tracking-[0.25em] opacity-60 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white"
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl mt-2 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-sm opacity-70">
          Don’t have an account? <Link to="/register" className="text-white underline">Register</Link>
        </div>
      </div>
    </div>
  );
}
