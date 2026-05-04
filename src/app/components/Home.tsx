import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

export function Home() {
  const { user, username, isAdmin, loading: authLoading, logout } = useAuth();
  const [works, setWorks] = useState<any[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isScrolling, setIsScrolling] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [worksPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // ---------------- logout ----------------
  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  // ---------------- scroll to works ----------------
  const scrollToWorks = () => {
    const worksSection = document.getElementById("works-section");
    if (worksSection) {
      worksSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ---------------- mouse ----------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ---------------- fetch works ----------------
  useEffect(() => {
    const fetchWorks = async () => {
      const start = (currentPage - 1) * worksPerPage;
      const end = start + worksPerPage - 1;

      const { data } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false })
        .range(start, end);

      const { count } = await supabase
        .from("videos")
        .select("id", { count: "exact", head: true });

      setWorks(data || []);
      setTotalPages(Math.ceil((count || 0) / worksPerPage));
    };

    fetchWorks();
  }, [currentPage, worksPerPage]);

  // ---------------- fetch notifications ----------------
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          video:video_id(title),
          comment:comment_id(nickname, content, parent_id)
        `)
        .eq("user_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (!error) {
        setNotifications(data || []);
        setUnreadCount((data || []).length);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // ---------------- mark notification as read ----------------
  const markAsRead = async (notificationId: string) => {
    console.log("Marking notification as read:", notificationId);
    
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);
    
    if (error) {
      console.error("Error marking as read:", error);
    } else {
      console.log("Successfully marked as read");
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // ---------------- smooth infinite scroll ----------------
  useEffect(() => {
    const container = document.getElementById("works-scroll-container");
    if (!container || !isScrolling) return;

    const scrollSpeed = 0.6;
    let animationFrame: number;
    let lastTime = 0;

    const scroll = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      const maxScroll = container.scrollWidth - container.clientWidth;
      
      if (maxScroll <= 0) {
        animationFrame = requestAnimationFrame(scroll);
        return;
      }

      const currentScroll = container.scrollLeft;
      
      // Calculate new scroll position
      let newScroll = currentScroll + scrollSpeed * (deltaTime / 16);
      
      // Smooth wrap around - crossfade style
      if (newScroll >= maxScroll) {
        // Calculate how much we've gone past the end
        const overshoot = newScroll - maxScroll;
        
        // Only reset when we've scrolled past one item width
        // This creates a seamless visual effect
        if (overshoot >= 450) { // Approximately one card width
          newScroll = overshoot - 450;
        }
      }

      container.scrollLeft = newScroll;

      animationFrame = requestAnimationFrame(scroll);
    };

    animationFrame = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrame);
  }, [isScrolling]);

  // ---------------- scroll light bars animation ----------------
  useEffect(() => {
    let animationFrame: number;
    let startTime: number | null = null;
    const duration = 20000; // 20秒完成一个完整周期

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      setScrollOffset(progress);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // ---------------- loading fallback ----------------
  if (!works.length) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        LOADING...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">

      <div
        className="fixed pointer-events-none z-50 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          background:
            "radial-gradient(circle, rgba(255,140,0,0.6) 0%, rgba(255,140,0,0.3) 30%, transparent 70%)",
        }}
      />

      <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-8 h-full flex justify-between items-center">
          <div className="flex gap-12 text-[0.75rem] tracking-[0.15em]">
            <Link to="/" className="hover:text-orange-500 transition-colors">HOME | 首页</Link>
            <button onClick={scrollToWorks} className="hover:text-orange-500 transition-colors">WORKS | 作品</button>
          </div>
          <div className="flex items-center gap-8 text-[0.75rem] tracking-[0.15em]">
            {authLoading ? (
              <span className="opacity-50">LOADING...</span>
            ) : user ? (
              <>
                <span className="opacity-70">
                  {username || user.email?.split("@")[0] || "USER"}
                </span>
                <div className="relative group cursor-pointer">
                  <MessageCircle className="w-5 h-5 hover:text-orange-500 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <div className="absolute right-0 mt-2 w-80 bg-black/95 backdrop-blur-sm border border-white/10 rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-50 max-h-96 overflow-y-auto">
                    <div className="text-sm text-orange-400 mb-3">NOTIFICATIONS</div>
                    {notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <Link
                            key={notification.id}
                            to={`/video/${notification.video_id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              markAsRead(notification.id);
                              setTimeout(() => {
                                window.location.href = `/video/${notification.video_id}`;
                              }, 100);
                            }}
                            className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <div className="text-xs text-orange-400 mb-1">
                              {notification.comment?.parent_id ? "REPLY" : "NEW COMMENT"}
                            </div>
                            <div className="text-sm font-medium truncate">
                              {notification.video?.title || "Unknown Video"}
                            </div>
                            <div className="text-xs opacity-60 mt-1">
                              {notification.comment?.nickname}: {notification.comment?.content?.slice(0, 30)}{notification.comment?.content?.length > 30 ? "..." : ""}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs opacity-60">No new notifications</div>
                    )}
                  </div>
                </div>
                {isAdmin && <Link to="/upload" className="text-orange-500 hover:text-orange-400 transition-colors">UPLOAD | 上传</Link>}
                <button
                  onClick={handleLogout}
                  className="hover:text-orange-500 transition-colors"
                >
                  LOGOUT | 登出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-orange-500 transition-colors">LOGIN | 登录</Link>
                <Link to="/register" className="hover:text-orange-500 transition-colors">REGISTER | 注册</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO（不动） */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Scrolling orange light bars */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* 水平光带 - 15条 */}
          {[...Array(15)].map((_, i) => {
            const baseTop = 5 + (i * 97) / 15;
            const speed = 0.3 + (i % 5) * 0.15;
            const offset = Math.sin(scrollOffset * Math.PI * 2 * speed + i * 0.7) * 50;
            const width = 30 + (i % 4) * 15;
            const left = (100 - width) / 2 + Math.cos(scrollOffset * Math.PI * 2 + i * 0.5) * 20;
            const barTop = baseTop;
            const barCenter = barTop;
            const distance = Math.abs(mousePosition.y / window.innerHeight * 100 - barCenter);
            const mouseBoost = Math.max(0, 1 - distance / 30) * 0.5;
            return (
              <div
                key={`h-${i}`}
                className="absolute h-[2px]"
                style={{
                  width: `${width}%`,
                  left: `${left}%`,
                  top: `${baseTop}%`,
                  transform: `translateX(${offset}px)`,
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,140,0,${0.6 + mouseBoost}) 50%, transparent 100%)`,
                  filter: "blur(1px)",
                  boxShadow: `0 0 ${6 + mouseBoost * 10}px rgba(255,140,0,${0.4 + mouseBoost})`,
                }}
              />
            );
          })}
          {/* 垂直光带 - 12条 */}
          {[...Array(12)].map((_, i) => {
            const baseLeft = 5 + (i * 90) / 12;
            const speed = 0.4 + (i % 4) * 0.1;
            const offset = Math.sin(scrollOffset * Math.PI * 2 * speed + i * 0.6) * 40;
            const height = 25 + (i % 5) * 10;
            const top = (100 - height) / 2 + Math.cos(scrollOffset * Math.PI * 2 * 1.2 + i * 0.4) * 15;
            const barLeft = baseLeft;
            const distance = Math.abs(mousePosition.x / window.innerWidth * 100 - barLeft);
            const mouseBoost = Math.max(0, 1 - distance / 25) * 0.5;
            return (
              <div
                key={`v-${i}`}
                className="absolute w-[2px]"
                style={{
                  height: `${height}%`,
                  top: `${top}%`,
                  left: `${baseLeft}%`,
                  transform: `translateY(${offset}px)`,
                  background: `linear-gradient(180deg, transparent 0%, rgba(255,140,0,${0.5 + mouseBoost}) 50%, transparent 100%)`,
                  filter: "blur(1px)",
                  boxShadow: `0 0 ${6 + mouseBoost * 10}px rgba(255,140,0,${0.3 + mouseBoost})`,
                }}
              />
            );
          })}
          {/* 斜向光带 - 8条 */}
          {[...Array(8)].map((_, i) => {
            const speed = 0.25 + (i % 3) * 0.1;
            const offset = Math.sin(scrollOffset * Math.PI * 2 * speed + i * 0.8) * 30;
            const width = 40 + (i % 3) * 20;
            const barTop = 20 + i * 10;
            const distanceY = Math.abs(mousePosition.y / window.innerHeight * 100 - barTop);
            const distanceX = Math.abs(mousePosition.x / window.innerWidth * 100 - 50);
            const mouseBoost = Math.max(0, 1 - Math.min(distanceY, distanceX) / 20) * 0.4;
            return (
              <div
                key={`d-${i}`}
                className="absolute h-[2px]"
                style={{
                  width: `${width}%`,
                  left: `${10 + (i * 5)}%`,
                  top: `${20 + i * 10}%`,
                  transform: `translateX(${offset}px) rotate(${-5 + i * 2}deg)`,
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,140,0,${0.4 + mouseBoost}) 50%, transparent 100%)`,
                  filter: "blur(1px)",
                  boxShadow: `0 0 ${4 + mouseBoost * 8}px rgba(255,140,0,${0.25 + mouseBoost})`,
                }}
              />
            );
          })}
          {/* 鼠标靠近时的全局光晕 */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: mousePosition.x - 200,
              top: mousePosition.y - 200,
              width: 400,
              height: 400,
              background: "radial-gradient(circle, rgba(255,140,0,0.15) 0%, transparent 70%)",
              transform: "translate(0, 0)",
            }}
          />
        </div>

        <div className="relative z-20 text-center px-8">
          <h1 className="text-[8rem] leading-[0.9] tracking-tighter mb-8" style={{ fontWeight: 900 }}>
            A D N A Y
            <br />
            Z H U
            <br />
            STRING WORKS
          </h1>
        </div>
      </section>

  

      {/* SCROLL LIST */}
      <section id="works-section" className="pb-32">
        <div
          id="works-scroll-container"
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseEnter={() => setIsScrolling(false)}
          onMouseLeave={() => setIsScrolling(true)}
        >
          <div className="flex gap-1 px-8 min-w-max">

            {works.map((work) => (
              <Link
                key={work.id}
                to={`/video/${work.id}`}
                className="group w-[450px] h-[450px] relative overflow-hidden"
              >
                <img
                  src={work.cover_url}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />

                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <h3 className="text-[2rem] font-bold">
                    {work.title}
                  </h3>

                  <p>{work.artist}</p>

                  <div className="text-orange-500 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    {work.likes_count}
                  </div>
                </div>
              </Link>
            ))}

          </div>
        </div>
      </section>

      {/* ALL WORKS List */}
      <section className="bg-black/30 backdrop-blur-sm py-24">
        <div className="max-w-[1800px] mx-auto px-8">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-[2.5rem] font-bold tracking-tight" style={{ fontWeight: 900 }}>
              ALL WORKS
            </h2>
            <div className="h-px w-32 bg-gradient-to-r from-orange-500/50 to-transparent" />
          </div>

          <div className="space-y-4">
            {works.map((work) => (
              <Link
                key={work.id}
                to={`/video/${work.id}`}
                className="group flex items-center gap-8 p-6 rounded-xl bg-black/20 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold truncate group-hover:text-orange-400 transition-colors">
                    {work.title}
                  </h3>
                  <p className="text-sm opacity-60 mt-1">
                    {work.artist}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Heart className="w-5 h-5" />
                    <span className="font-medium">{work.likes_count}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:border-orange-500/50 transition-all">
                    <svg className="w-5 h-5 text-orange-400 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-6 mt-12">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-6 py-3 rounded-lg border transition-all duration-300 ${
                currentPage === 1
                  ? "border-gray-600 text-gray-500 cursor-not-allowed"
                  : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
              }`}
            >
              PREV
            </button>
            <span className="text-lg font-medium text-orange-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-6 py-3 rounded-lg border transition-all duration-300 ${
                currentPage === totalPages
                  ? "border-gray-600 text-gray-500 cursor-not-allowed"
                  : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
              }`}
            >
              NEXT
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}