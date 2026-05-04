import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

export function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, username, isAdmin, loading: authLoading } = useAuth();

  const [video, setVideo] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [circles, setCircles] = useState<{ x: number; y: number; size: number; opacity: number; delay: number; duration: number }[]>([]);
  const [boxes, setBoxes] = useState<{ x: number; y: number; scale: number; opacity: number; delay: number }[]>([]);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------------- mouse effect ----------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ---------------- initialize circles ----------------
  useEffect(() => {
    const newCircles = Array.from({ length: 15 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 50 + Math.random() * 200,
      opacity: 0.05 + Math.random() * 0.15,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
    }));
    setCircles(newCircles);

    // Initialize boxes
    const newBoxes = Array.from({ length: 10 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: 0.5 + Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.25,
      delay: Math.random() * 5,
    }));
    setBoxes(newBoxes);
  }, []);

  // ---------------- fetch video and likes ----------------
  useEffect(() => {
    const fetchVideoAndLikes = async () => {
      setIsLoading(true);
      
      // Fetch video
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .single();

      if (!videoError && videoData) {
        setVideo(videoData);
        setLikesCount(videoData.likes_count || 0);
        console.log("Fetched video:", videoData.title, "likes:", videoData.likes_count);
      }

      // Fetch like status
      if (!id || !user?.id) {
        setLiked(false);
      } else {
        const { data: likeData } = await supabase
          .from("likes")
          .select("id")
          .eq("video_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        const isLiked = !!likeData;
        setLiked(isLiked);
        console.log("Like status:", isLiked);
      }

      setIsLoading(false);
    };

    if (id) fetchVideoAndLikes();
  }, [id, user?.id]);

  // ---------------- fetch comments ----------------
  useEffect(() => {
    const fetchComments = async () => {
      const { data: allComments } = await supabase
        .from("comments")
        .select("*")
        .eq("video_id", id)
        .order("created_at", { ascending: false });

      // Organize comments with replies
      const topLevelComments = (allComments || []).filter(c => !c.parent_id);
      const commentsWithReplies = topLevelComments.map(comment => ({
        ...comment,
        replies: (allComments || []).filter(c => c.parent_id === comment.id)
      }));

      setComments(commentsWithReplies);
    };

    if (id) fetchComments();
  }, [id]);

  // ---------------- add comment ----------------
  const handleAddComment = async () => {
    if (!commentText.trim() || !id) return;
    if (!user) {
      navigate("/login");
      return;
    }

    const nickname =
      username || user?.email?.split("@")[0] || "USER";

    const newComment = {
      video_id: id,
      user_id: user.id,
      nickname,
      content: commentText,
    };

    const { data, error } = await supabase
      .from("comments")
      .insert(newComment)
      .select()
      .single();

    if (!error && data) {
      setComments((prev) => [data, ...prev]);
      setCommentText("");
      
      // Notify Adnay about new comment
      await notifyAdnay(data.id, id);
    }
  };

  // ---------------- notify Adnay about new comment ----------------
  const notifyAdnay = async (commentId: string, videoId: string) => {
    console.log("Trying to notify Adnay...");
    
    // Find Adnay user
    const { data: adnay, error: adnayError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", "Adnay")
      .single();

    if (adnayError) {
      console.error("Error finding Adnay:", adnayError);
      return;
    }

    if (adnay) {
      // Don't notify if current user is Adnay (don't notify self)
      if (user?.id === adnay.id) {
        console.log("Current user is Adnay, skipping notification");
        return;
      }
      
      console.log("Found Adnay:", adnay.id);
      const { error: notifyError } = await supabase
        .from("notifications")
        .insert({
          user_id: adnay.id,
          comment_id: commentId,
          video_id: videoId,
        });
      
      if (notifyError) {
        console.error("Error creating notification:", notifyError);
      } else {
        console.log("Notification created successfully");
      }
    } else {
      console.log("Adnay not found");
    }
  };

  // ---------------- reply to comment ----------------
  const handleReply = (comment: any) => {
    setReplyingTo(comment.id);
    setReplyText("");
  };

  // ---------------- submit reply ----------------
  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || !id) return;
    if (!user) {
      navigate("/login");
      return;
    }

    const nickname = username || user?.email?.split("@")[0] || "USER";

    const newReply = {
      video_id: id,
      user_id: user.id,
      parent_id: parentId,
      nickname,
      content: replyText,
    };

    const { data, error } = await supabase
      .from("comments")
      .insert(newReply)
      .select()
      .single();

    if (!error && data) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), data] }
            : c
        )
      );
      setReplyText("");
      setReplyingTo(null);
      
      // Notify Adnay about new reply
      await notifyAdnay(data.id, id);
      
      // Notify the original comment author about the reply
      const parentComment = comments.find(c => c.id === parentId);
      if (parentComment?.user_id) {
        // Don't notify if replying to oneself
        if (parentComment.user_id !== user.id) {
          await notifyUser(parentComment.user_id, data.id, id);
        } else {
          console.log("Replying to own comment, skipping notification");
        }
      }
    }
  };

  // ---------------- notify specific user ----------------
  const notifyUser = async (userId: string, commentId: string, videoId: string) => {
    await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        comment_id: commentId,
        video_id: videoId,
      });
  };

  // ---------------- delete comment ----------------
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("确定要删除这条评论吗？")) return;

    // First delete related notifications
    await supabase
      .from("notifications")
      .delete()
      .eq("comment_id", commentId);

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  // ---------------- delete video ----------------
  const handleDeleteVideo = async () => {
    if (!video?.id) return;
    if (!confirm("确定要删除这个视频吗？")) return;

    setIsDeleting(true);

    try {
      // Delete related notifications first
      await supabase
        .from("notifications")
        .delete()
        .eq("video_id", video.id);

      // Delete related comments
      await supabase
        .from("comments")
        .delete()
        .eq("video_id", video.id);

      // Delete related likes
      await supabase
        .from("likes")
        .delete()
        .eq("video_id", video.id);

      // Delete video from storage
      if (video.video_id) {
        await supabase.storage
          .from("videos")
          .remove([video.video_id]);
      }

      // Delete video from database
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", video.id);

      if (!error) {
        // Verify deletion
        const { data: remainingVideo } = await supabase
          .from("videos")
          .select("id")
          .eq("id", video.id)
          .maybeSingle();

        if (!remainingVideo) {
          window.location.href = "/";
        } else {
          setIsDeleting(false);
          alert("删除失败，视频仍存在于数据库中。请检查数据库RLS策略。");
        }
      } else {
        setIsDeleting(false);
        alert("删除视频失败，请重试");
      }
    } catch (err) {
      setIsDeleting(false);
      alert("删除失败，请重试");
    }
  };

  if (!video?.id || videoLoadFailed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        {/* Deleting overlay */}
        {isDeleting && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <div className="text-xl tracking-[0.2em] opacity-80">DELETING...</div>
              <div className="text-sm opacity-50 mt-2">正在删除视频，请稍候...</div>
            </div>
          </div>
        )}

        {isLoading && !videoLoadFailed ? (
          <div className="text-center">
            <div className="text-2xl tracking-[0.3em] opacity-70 animate-pulse">LOADING...</div>
            <div className="text-sm opacity-50 mt-4">正在加载视频内容...</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-2xl tracking-[0.3em] opacity-70">VIDEO NOT FOUND</div>
            <div className="text-sm opacity-50 mt-4">视频不存在或已被删除</div>
            <div className="flex gap-4 justify-center mt-8">
              <Link to="/" className="px-8 py-3 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/10 transition-colors">
                返回首页
              </Link>
              {user && isAdmin && video?.id && (
                <button
                  onClick={async () => {
                    if (confirm("确定要从数据库中删除这个无效视频吗？")) {
                      const { error } = await supabase
                        .from("videos")
                        .delete()
                        .eq("id", video.id);
                      if (!error) {
                        alert("删除成功");
                        window.location.href = "/";
                      } else {
                        console.error("Delete error:", error);
                        alert("删除失败，请检查数据库RLS策略");
                      }
                    }
                  }}
                  className="px-8 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  从数据库删除
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Deleting overlay */}
      {isDeleting && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <div className="text-xl tracking-[0.2em] opacity-80">DELETING...</div>
            <div className="text-sm opacity-50 mt-2">正在删除视频，请稍候...</div>
          </div>
        </div>
      )}

      {/* Animated circles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {circles.map((circle, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${circle.x}%`,
              top: `${circle.y}%`,
              width: `${circle.size}px`,
              height: `${circle.size}px`,
              opacity: circle.opacity,
              background: `radial-gradient(circle, rgba(255,140,0,${circle.opacity * 2}) 0%, rgba(255,140,0,0) 70%)`,
              animation: `circleFloat ${circle.duration}s ease-in-out infinite`,
              animationDelay: `${circle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes circleFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.1;
          }
          50% {
            transform: translateY(-20px) scale(1.05);
            opacity: 0.15;
          }
        }
        @keyframes boxFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(5deg);
          }
        }
      `}</style>

      {/* Animated orange boxes - bottom layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {boxes.map((box, i) => (
          <div
            key={`box-${i}`}
            className="absolute bg-orange-500"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${20 + box.scale * 30}px`,
              height: `${20 + box.scale * 30}px`,
              opacity: box.opacity,
              transform: `rotate(${i * 15}deg)`,
              animation: `boxFloat ${3 + box.scale * 2}s ease-in-out infinite`,
              animationDelay: `${box.delay}s`,
              boxShadow: `0 0 ${20 + box.scale * 15}px rgba(255,140,0,${box.opacity * 0.8})`,
            }}
          />
        ))}
      </div>

      {/* mouse glow */}
      <div
        className="fixed pointer-events-none z-50 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          background:
            "radial-gradient(circle, rgba(255,140,0,0.6) 0%, rgba(255,140,0,0.3) 30%, transparent 70%)",
        }}
      />

      {/* nav（不动） */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-8 py-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 text-[0.75rem] tracking-[0.15em]">
            <ArrowLeft className="w-4 h-4" />
            BACK | 返回
          </Link>
        </div>
      </nav>

      <div className="pt-24">
        <div className="max-w-[1800px] mx-auto px-8 py-24">
          <div className="grid gap-16 xl:grid-cols-[1.6fr_1fr] items-start">

            {/* left: video */}
            <div className="space-y-8 bg-black/95 backdrop-blur-sm rounded-2xl p-8">
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-[0_0_70px_rgba(255,140,0,0.15)]">
                {video.video_type === "youtube" || video.video_type === "bilibili" ? (
                  <iframe
                    className="w-full h-full"
                    src={
                      video.video_type === "youtube"
                        ? `https://www.youtube.com/embed/${video.video_id}`
                        : `https://player.bilibili.com/player.html?bvid=${video.video_id}&page=1&autoplay=0`
                    }
                    title={video.title}
                    allowFullScreen
                  />
                ) : (
                  <video
                    className="w-full h-full"
                    src={video.video_url}
                    title={video.title}
                    controls
                    onError={async () => {
                      console.error("Video loading failed");
                      // Auto delete from database if video file doesn't exist
                      if (user && isAdmin) {
                        console.log("Auto-deleting invalid video from database...");
                        await supabase
                          .from("videos")
                          .delete()
                          .eq("id", video.id);
                      }
                      setVideoLoadFailed(true);
                    }}
                  />
                )}
              </div>
            </div>

            {/* right: info */}
            <div className="space-y-12">
              <div>
                <h1 className="text-[4rem] leading-[0.95] mb-6" style={{ fontWeight: 900 }}>
                  {video.title}
                </h1>
                <div className="text-[1rem] opacity-70 mb-8">
                  BY {video.artist}
                </div>
                <p className="opacity-80 leading-8">
                  {video.description}
                </p>
              </div>

              <div className="flex flex-col gap-8">
                <div className="flex flex-wrap items-center gap-6">
                  <button
                    onClick={async () => {
                      if (!video?.id) return;
                      if (!user) {
                        navigate("/login");
                        return;
                      }

                      if (liked) {
                        // Unlike: delete from likes table
                        const deleteResult = await supabase
                          .from("likes")
                          .delete()
                          .eq("video_id", video.id)
                          .eq("user_id", user.id);

                        console.log("Delete result:", deleteResult);

                        const newCount = Math.max(0, likesCount - 1);
                        const updateResult = await supabase
                          .from("videos")
                          .update({ likes_count: newCount })
                          .eq("id", video.id);

                        console.log("Update result:", updateResult);

                        // Refresh from database to confirm
                        const { data: updatedVideo } = await supabase
                          .from("videos")
                          .select("likes_count")
                          .eq("id", video.id)
                          .single();

                        const confirmedCount = updatedVideo?.likes_count || newCount;
                        setLiked(false);
                        setLikesCount(confirmedCount);
                      } else {
                        // Like: insert into likes table
                        const insertResult = await supabase
                          .from("likes")
                          .insert({ video_id: video.id, user_id: user.id });

                        console.log("Insert result:", insertResult);

                        const newCount = likesCount + 1;
                        const updateResult = await supabase
                          .from("videos")
                          .update({ likes_count: newCount })
                          .eq("id", video.id);

                        console.log("Update result:", updateResult);

                        // Refresh from database to confirm
                        const { data: updatedVideo } = await supabase
                          .from("videos")
                          .select("likes_count")
                          .eq("id", video.id)
                          .single();

                        const confirmedCount = updatedVideo?.likes_count || newCount;
                        setLiked(true);
                        setLikesCount(confirmedCount);
                      }
                    }}
                    className={`px-8 py-4 flex items-center gap-3 border transition-all duration-200 ${liked ? "bg-orange-500 text-black" : "hover:border-orange-500/50"}`}
                  >
                    <Heart className={`w-5 h-5 transition-all duration-200 ${liked ? "fill-current" : ""}`} />
                    {liked ? "LIKED" : "LIKE"}
                  </button>

                  <div className="text-[1.2rem]" style={{ fontWeight: 700 }}>
                    {likesCount}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={handleDeleteVideo}
                      disabled={isDeleting}
                      className={`px-8 py-4 flex items-center gap-3 border transition-colors ${
                        isDeleting
                          ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                          : "bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/30"
                      }`}
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                          DELETING...
                        </>
                      ) : (
                        "DELETE"
                      )}
                    </button>
                  )}
                </div>

                <div className="border border-white/10 rounded-3xl p-8">
                  <div className="text-sm uppercase opacity-50 tracking-[0.25em] mb-6">
                    Comments
                  </div>
                  <div className="space-y-6">
                    <div className="flex gap-4 border-b border-white/10 pb-4">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-transparent outline-none"
                        placeholder={user ? "ADD YOUR THOUGHTS" : "请先登录后评论"}
                        disabled={!user || authLoading}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!user || authLoading}
                        className="px-5 py-3 bg-white text-black disabled:opacity-50"
                      >
                        POST
                      </button>
                    </div>

                    <div className="space-y-8 max-h-[360px] overflow-y-auto pr-2 scrollbar-hide">
                      {comments.map((c) => (
                        <div key={c.id} className="pb-6 border-b border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[0.75rem] opacity-70">
                              {c.nickname}
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleReply(c)}
                                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                              >
                                REPLY
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                  DELETE
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="opacity-70">{c.content}</p>
                          
                          {/* Reply input */}
                          {replyingTo === c.id && (
                            <div className="mt-4 flex gap-4 border-b border-white/10 pb-4">
                              <input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm"
                                placeholder="Reply..."
                                disabled={!user || authLoading}
                              />
                              <button
                                onClick={() => handleSubmitReply(c.id)}
                                disabled={!user || authLoading}
                                className="px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 disabled:opacity-50"
                              >
                                REPLY
                              </button>
                              <button
                                onClick={() => setReplyingTo(null)}
                                className="px-4 py-2 text-gray-400 hover:text-gray-300"
                              >
                                CANCEL
                              </button>
                            </div>
                          )}

                          {/* Display replies */}
                          {c.replies && c.replies.length > 0 && (
                            <div className="mt-4 pl-6 border-l border-white/10 space-y-4">
                              {c.replies.map((reply: { id: string; nickname: string; content: string }) => (
                                <div key={reply.id}>
                                  <div className="text-[0.7rem] opacity-50 mb-1">
                                    {reply.nickname}
                                  </div>
                                  <p className="text-sm opacity-60">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}