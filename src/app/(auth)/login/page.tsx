"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PostLogin } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...props}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...props}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// 로그인 페이지는 로그인 기능만 담당하며 페이지 렌더링 전 인증 여부 판단은 middleWare 파일에서 담당한다.
export default function LoginPage() {
  const SAVED_ID_KEY = "saved_login_id";

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const router = useRouter();

  // 저장된 아이디 복원
  useEffect(() => {
    const savedId = localStorage.getItem(SAVED_ID_KEY);
    if (savedId) {
      setId(savedId);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !pw) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await PostLogin(id, pw);
      if (res.resultCode === "SUCCESS") {
        // 아이디 저장 체크박스 유지 용도
        if (remember) {
          localStorage.setItem(SAVED_ID_KEY, id);
        } else {
          localStorage.removeItem(SAVED_ID_KEY);
        }
        // store에 엑세스 토큰과 이메일을 저장한다.
        login(res.data.accessToken, res.data.email);
        // router.replace 는 클라이언트 라우터 캐시에 남아있는
        // (토큰 만료 시 생성된) /dashboard → /login 리다이렉트를 재사용해
        // 로그인 직후 다시 로그인 페이지로 튕기는 문제가 있다.
        // 하드 내비게이션으로 미들웨어를 새로 태워 refreshToken 쿠키를 확실히 반영한다.
        window.location.replace("/dashboard");
      } else {
        setError(res.resultMessage || "로그인에 실패했습니다.");
      }
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 grid bg-white"
      style={{ gridTemplateColumns: "4fr 6fr" }}
    >
      {/* Left panel */}
      <div
        className="relative flex flex-col overflow-hidden px-16 py-14"
        style={{
          background:
            "linear-gradient(135deg, #0d1340 0%, #131d5c 50%, #1c2878 100%)",
        }}
      >
        {/* Subtle radial overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0, transparent 40%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0, transparent 40%)",
          }}
        />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10">
          {/* Line art background */}
          <img
            src="/logo_line.png"
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{ opacity: 0.02 }}
          />

          <p
            className="relative z-10 font-bold text-white text-left"
            style={{
              fontSize: 28,
              lineHeight: 1.45,
              letterSpacing: "-0.02em",
            }}
          >
            안전한 데이터 비식별화로
            <br />더 가치를 만드는 경찰 데이터 플랫폼
          </p>

          {/* Main illustration */}
          <img
            src="/login_Illust.png"
            alt="login illustration"
            className="relative z-10 w-full max-w-xs object-contain select-none"
          />
        </div>

        <p
          className="relative z-10 mt-auto text-center"
          style={{ fontSize: 13, color: "#8a93a8" }}
        >
          © 2026 비식별 엔진. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div
        className="grid overflow-y-auto px-12 py-14"
        style={{ background: "#fafbfd", gridTemplateRows: "1fr auto" }}
      >
        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col self-center justify-self-center w-full"
          style={{
            maxWidth: 520,
            background: "#fff",
            border: "1px solid #ebedf2",
            borderRadius: 14,
            padding: "44px 48px",
            boxShadow: "0 4px 24px rgba(15,22,40,0.04)",
          }}
        >
          {/* Brand */}
          <div className="flex items-center justify-center gap-2.5 mb-2.5">
            <img src="/logo.png" alt="logo" className="w-18 object-contain" />
            <span
              className="font-extrabold"
              style={{
                fontSize: 24,
                color: "#1d2c4e",
                letterSpacing: "-0.02em",
                fontWeight: "bold",
              }}
            >
              비식별 엔진
            </span>
          </div>

          <p
            className="text-center mb-7"
            style={{ fontSize: 13.5, color: "#6b7388" }}
          >
            계정에 로그인하여 대시보드에 접속하세요
          </p>

          {/* 아이디 */}
          <label
            className="block font-bold mb-2"
            style={{ fontSize: 13.5, color: "#1f2330" }}
          >
            아이디
          </label>
          <div className="relative mb-4">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ color: "#9aa1b3" }}
            >
              <UserIcon />
            </span>
            <input
              type="text"
              placeholder="아이디를 입력하세요"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full outline-none transition-colors"
              style={{
                padding: "13px 14px 13px 42px",
                border: "1px solid #d9deea",
                borderRadius: 8,
                fontSize: 14,
                color: "#1f2330",
                background: "#fff",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
              onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
            />
          </div>

          {/* 비밀번호 */}
          <label
            className="block font-bold mb-2"
            style={{ fontSize: 13.5, color: "#1f2330" }}
          >
            비밀번호
          </label>
          <div className="relative mb-5">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ color: "#9aa1b3" }}
            >
              <LockIcon />
            </span>
            <input
              type={showPw ? "text" : "password"}
              placeholder="비밀번호를 입력하세요"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full outline-none transition-colors"
              style={{
                padding: "13px 42px 13px 42px",
                border: "1px solid #d9deea",
                borderRadius: 8,
                fontSize: 14,
                color: "#1f2330",
                background: "#fff",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
              onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors"
              style={{ color: "#9aa1b3" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#1d2c4e")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#9aa1b3")
              }
            >
              <EyeIcon />
            </button>
          </div>

          {/* Remember / Forgot */}
          <div
            className="flex items-center justify-between mb-5"
            style={{ fontSize: 13 }}
          >
            <label
              className="flex items-center gap-2 cursor-pointer select-none"
              style={{ color: "#3a4055" }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="sr-only"
              />
              {/* 커스텀 체크박스 */}
              <span
                className="flex-shrink-0 flex items-center justify-center transition-colors"
                style={{
                  width: 16,
                  height: 16,
                  border: `1.5px solid ${remember ? "#1d2c4e" : "#c5cbd9"}`,
                  borderRadius: 3,
                  background: remember ? "#1d2c4e" : "transparent",
                }}
              >
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 3.5L3.8 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span>아이디 저장</span>
            </label>
            <span
              className="font-bold cursor-pointer hover:underline"
              style={{ color: "#1d2c4e" }}
            >
              비밀번호 찾기
            </span>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm text-center"
              style={{
                background: "#fff1f1",
                color: "#c0392b",
                border: "1px solid #fcd5d5",
              }}
            >
              {error}
            </div>
          )}

          {/* 회원가입 링크 */}
          <p className="text-center mb-5" style={{ fontSize: 13.5, color: "#6b7388" }}>
            계정이 없으신가요?{" "}
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="font-bold hover:underline"
              style={{ color: "#1d2c4e", background: "none", border: "none", cursor: "pointer" }}
            >
              회원가입
            </button>
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full font-bold transition-colors flex items-center justify-center gap-2"
            style={{
              padding: 13,
              background: isLoading ? "#4a5e8a" : "#1d2c4e",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 8,
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isLoading)
                (e.currentTarget as HTMLElement).style.background = "#2b3f6c";
            }}
            onMouseLeave={(e) => {
              if (!isLoading)
                (e.currentTarget as HTMLElement).style.background = "#1d2c4e";
            }}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                로그인 중...
              </>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        {/* Right footer */}
        <p
          className="w-full text-center"
          style={{ fontSize: 13, color: "#8a93a8" }}
        >
          비식별 엔진은 안전하고 신뢰할 수 있는 데이터 처리를 지향합니다.
        </p>
      </div>
    </div>
  );
}
