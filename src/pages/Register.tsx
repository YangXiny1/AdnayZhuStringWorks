import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    // 检查用户名是否已存在
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existingUser) {
      setError("用户名或邮箱已被使用。");
      setLoading(false);
      return;
    }

    // 直接在 profiles 表中创建用户（自动生成 UUID）
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ 
        id: crypto.randomUUID(), 
        username, 
        email, 
        password, 
        role: "user" 
      });

    setLoading(false);

    if (insertError) {
      setError("注册失败，请重试。");
      console.error("Registration error:", insertError);
      return;
    }

    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md border border-white/10 rounded-3xl p-10">
        <h1 className="text-3xl font-bold mb-6">Register</h1>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm uppercase tracking-[0.25em] opacity-60 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-sm uppercase tracking-[0.25em] opacity-60 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
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
              minLength={6}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white"
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl mt-2 disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="mt-6 text-sm opacity-70">
          Already have an account? <Link to="/login" className="text-white underline">Login</Link>
        </div>
      </div>
    </div>
  );
}
