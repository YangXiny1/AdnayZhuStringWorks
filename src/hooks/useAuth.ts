import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
}

type Profile = {
  id: string;
  role: "admin" | "user";
} | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    try {
      // 从 localStorage 获取用户信息
      const storedUser = localStorage.getItem("user");
      
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        setProfile({ id: parsedUser.id, role: parsedUser.role });
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem("user");
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return {
    user,
    username: user?.username,
    profile,
    role: profile?.role,
    isAdmin: profile?.role === "admin",
    loading,
    logout,
  };
}
