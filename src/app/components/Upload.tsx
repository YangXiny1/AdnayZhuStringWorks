import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export function Upload() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    description: "",
    videoLink: "",
  });

  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [boxAnimations, setBoxAnimations] = useState<{ x: number; y: number; scale: number; opacity: number; delay: number }[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Initialize box animations
  useEffect(() => {
    const boxes = Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: 0.5 + Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.3,
      delay: Math.random() * 5,
    }));
    setBoxAnimations(boxes);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        LOADING...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold mb-4">Unauthorized</h1>
        <p className="text-gray-400 mb-8">You are not authorized to access this page.</p>
        <Link to="/" className="text-orange-500 hover:underline">
          Go back to home
        </Link>
      </div>
    );
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFile) {
      alert("请上传视频");
      return;
    }

    if (!formData.title || !formData.artist) {
      alert("请填写标题和作者");
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus("uploading");
      setUploadProgress(0);

      // 1. 文件名
      const fileName = `${Date.now()}-${videoFile.name}`;
      const bucketName = "videos";

      // 2. 上传
      setUploadProgress(20);
      console.log("Starting upload to bucket:", bucketName, "file:", fileName);

      // 添加超时处理
      const uploadPromise = supabase.storage
        .from(bucketName)
        .upload(fileName, videoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("上传超时（60秒）")), 60000)
      );

      const { data, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

      if (uploadError) {
        console.error("upload error:", uploadError);
        setUploadStatus("error");
        setIsUploading(false);
        alert("上传失败: " + uploadError.message);
        return;
      }
      console.log("Upload successful, data:", data);
      setUploadProgress(70);

      // 3. public url
      const { data: urlData, error: urlError } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      if (urlError) {
        console.error("getPublicUrl error:", urlError);
        setUploadStatus("error");
        setIsUploading(false);
        alert("获取文件链接失败: " + urlError.message);
        return;
      }

      const videoUrl = urlData.publicUrl;
      console.log("Public URL:", videoUrl);

      setUploadProgress(85);

      // 4. insert db
      const { error: dbError } = await supabase.from("videos").insert({
        title: formData.title,
        artist: formData.artist,
        description: formData.description,
        cover_url: coverImage,
        video_type: "local",
        video_id: fileName,
        video_url: videoUrl,
        likes_count: 0,
      });

      if (dbError) {
        console.error("db error:", dbError);
        setUploadStatus("error");
        setIsUploading(false);
        alert("保存到数据库失败: " + dbError.message);
        return;
      }

      console.log("Database insert successful");

      setUploadProgress(100);
      setUploadStatus("success");

      setTimeout(() => {
        alert("上传成功");
        navigate("/");
      }, 500);

    } catch (err) {
      console.error("Upload exception:", err);
      setUploadStatus("error");
      setIsUploading(false);
      alert("上传异常: " + (err instanceof Error ? err.message : "未知错误"));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">

      {/* Mouse glow effect */}
      <div
        className="fixed pointer-events-none z-50 w-96 h-96 rounded-full opacity-30 blur-3xl transition-opacity duration-300"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          background:
            "radial-gradient(circle, rgba(255,140,0,0.6) 0%, rgba(255,140,0,0.3) 30%, transparent 70%)",
        }}
      />

      {/* Animated orange boxes on the right */}
      <div className="fixed right-0 top-0 w-1/2 h-full pointer-events-none overflow-hidden">
        {boxAnimations.map((box, i) => (
          <div
            key={i}
            className="absolute bg-orange-500"
            style={{
              right: `${box.x}%`,
              top: `${box.y}%`,
              width: `${20 + box.scale * 30}px`,
              height: `${20 + box.scale * 30}px`,
              opacity: box.opacity,
              transform: `rotate(${i * 15}deg)`,
              animation: `float ${3 + box.scale * 2}s ease-in-out infinite`,
              animationDelay: `${box.delay}s`,
              filter: "blur(0px)",
              boxShadow: `0 0 ${20 + box.scale * 15}px rgba(255,140,0,${box.opacity * 0.8})`,
            }}
          />
        ))}
      </div>

      {/* CSS for box animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(5deg);
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-8 py-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 text-[0.75rem] tracking-[0.15em] hover:text-orange-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>BACK | 返回</span>
          </Link>
          <div className="text-[0.7rem] tracking-[0.2em] opacity-50">
            UPLOAD NEW WORK
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-32 px-8 relative z-10">
        <div className="max-w-[1200px] mx-auto">

          {/* Hero */}
          <div className="mb-24">
            <div className="text-[0.7rem] tracking-[0.25em] mb-8 opacity-50">
              CONTRIBUTE
            </div>
            <h1 className="text-[7rem] leading-[0.9] tracking-tighter max-w-4xl" style={{ fontWeight: 900 }}>
              SUBMIT
              <br />
              YOUR
              <br />
              PERFORMANCE
            </h1>
          </div>

          {/* FORM（完全没动UI） */}
          <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-16">
            <div className="col-span-8 space-y-16">

              {/* COVER */}
              <div>
                <label className="block text-[0.7rem] tracking-[0.2em] mb-4 opacity-50">
                  ALBUM COVER
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-white"
                />

                {coverImage && (
                  <img src={coverImage} className="w-40 mt-4" />
                )}
              </div>

              {/* TITLE */}
              <div>
                <label className="block text-[0.7rem] tracking-[0.2em] mb-4 opacity-50">
                  TITLE
                </label>
                <input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-white/30 pb-4 text-[1.5rem]"
                />
              </div>

              {/* ARTIST */}
              <div>
                <label className="block text-[0.7rem] tracking-[0.2em] mb-4 opacity-50">
                  ARTIST NAME
                </label>
                <input
                  value={formData.artist}
                  onChange={(e) =>
                    setFormData({ ...formData, artist: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-white/30 pb-4 text-[1.5rem]"
                />
              </div>

              {/* VIDEO FILE */}
              <div>
                <label className="block text-[0.7rem] tracking-[0.2em] mb-4 opacity-50">
                  VIDEO FILE
                </label>

                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setVideoFile(file);
                  }}
                  disabled={isUploading}
                />

                {videoFile && (
                  <div className="text-xs opacity-60 mt-2">
                    {videoFile.name}
                  </div>
                )}

                {/* 进度条显示 */}
                {isUploading && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs opacity-70">
                        {uploadStatus === "uploading" ? "UPLOADING..." : uploadStatus === "success" ? "SUCCESS" : "FAILED"}
                      </span>
                      <span className="text-xs text-orange-500 font-medium">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${uploadStatus === "success" ? "bg-green-500" : uploadStatus === "error" ? "bg-red-500" : "bg-orange-500"}`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-[0.7rem] tracking-[0.2em] mb-4 opacity-50">
                  DESCRIPTION
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-white/30 pb-4 h-40"
                />
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-orange-500 text-black py-6 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isUploading ? "上传中..." : "SUBMIT WORK"}
              </button>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}