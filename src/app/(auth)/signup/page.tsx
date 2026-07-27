"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostJoin, RANK_LABEL, RANK_ORDER, type UserRole, type Rank } from "@/lib/api";
import { toast } from "sonner";

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "USER", label: "일반 사용자" },
  { value: "WORKER", label: "담당자" },
  { value: "INSPECTOR", label: "감사관" },
  { value: "ADMIN", label: "관리자" },
];

const inputStyle = {
  padding: "13px 14px 13px 42px",
  border: "1px solid #d9deea",
  borderRadius: 8,
  fontSize: 14,
  color: "#1f2330",
  background: "#fff",
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
  width: "100%",
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontWeight: 700,
  fontSize: 13.5,
  color: "#1f2330",
  marginBottom: 8,
};

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [department, setDepartment] = useState("");
  const [rank, setRank] = useState<Rank | "">("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !name || !organization || !department || !rank || !pw || !pwConfirm) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (pw !== pwConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);
    try {
      await PostJoin({ email, name, password: pw, role, organization, department, rank });
      toast.success("회원가입이 완료됐습니다. 로그인해주세요.");
      router.replace("/login");
    } catch {
      setError("회원가입에 실패했습니다. 입력 정보를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 grid bg-white" style={{ gridTemplateColumns: "4fr 6fr" }}>
      {/* Left panel */}
      <div
        className="relative flex flex-col overflow-hidden px-16 py-14"
        style={{ background: "linear-gradient(135deg, #0d1340 0%, #131d5c 50%, #1c2878 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0, transparent 40%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0, transparent 40%)",
          }}
        />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10">
          <img src="/logo_line.png" alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" style={{ opacity: 0.02 }} />
          <p className="relative z-10 font-bold text-white text-left" style={{ fontSize: 28, lineHeight: 1.45, letterSpacing: "-0.02em" }}>
            안전한 데이터 비식별화로
            <br />더 가치를 만드는 경찰 데이터 플랫폼
          </p>
          <img src="/login_Illust.png" alt="illustration" className="relative z-10 w-full max-w-xs object-contain select-none" />
        </div>
        <p className="relative z-10 mt-auto text-center" style={{ fontSize: 13, color: "#8a93a8" }}>
          © 2026 비식별 엔진. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="grid overflow-y-auto px-12 py-14" style={{ background: "#fafbfd", gridTemplateRows: "1fr auto" }}>
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
            <span className="font-extrabold" style={{ fontSize: 24, color: "#1d2c4e", letterSpacing: "-0.02em" }}>
              비식별 엔진
            </span>
          </div>
          <p className="text-center mb-7" style={{ fontSize: 13.5, color: "#6b7388" }}>
            새 계정을 생성하여 시스템에 참여하세요
          </p>

          {/* 이름 */}
          <label style={labelStyle}>이름</label>
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9aa1b3" }}>
              <UserIcon />
            </span>
            <input
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
              onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
            />
          </div>

          {/* 이메일 */}
          <label style={labelStyle}>이메일</label>
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9aa1b3" }}>
              <MailIcon />
            </span>
            <input
              type="email"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
              onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
            />
          </div>

          {/* 소속 / 부서 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>소속</label>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="예: 서울지방경찰청"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  style={{ ...inputStyle, padding: "13px 14px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
                  onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>부서</label>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="예: 수사과"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ ...inputStyle, padding: "13px 14px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
                  onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
                />
              </div>
            </div>
          </div>

          {/* 직급 */}
          <label style={labelStyle}>직급</label>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {RANK_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRank(r)}
                style={{
                  padding: "9px 0",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: rank === r ? 700 : 500,
                  border: `1.5px solid ${rank === r ? "#1d2c4e" : "#d9deea"}`,
                  background: rank === r ? "#1d2c4e" : "#fff",
                  color: rank === r ? "#fff" : "#6b7388",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {RANK_LABEL[r]}
              </button>
            ))}
          </div>

          {/* 비밀번호 */}
          <label style={labelStyle}>비밀번호</label>
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9aa1b3" }}>
              <LockIcon />
            </span>
            <input
              type={showPw ? "text" : "password"}
              placeholder="비밀번호를 입력하세요"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ ...inputStyle, padding: "13px 42px 13px 42px" }}
              onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
              onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#9aa1b3" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#1d2c4e")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#9aa1b3")}
            >
              <EyeIcon />
            </button>
          </div>

          {/* 비밀번호 확인 */}
          <label style={labelStyle}>비밀번호 확인</label>
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9aa1b3" }}>
              <LockIcon />
            </span>
            <input
              type={showPwConfirm ? "text" : "password"}
              placeholder="비밀번호를 다시 입력하세요"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              style={{ ...inputStyle, padding: "13px 42px 13px 42px" }}
              onFocus={(e) => (e.target.style.borderColor = "#1d2c4e")}
              onBlur={(e) => (e.target.style.borderColor = "#d9deea")}
            />
            <button
              type="button"
              onClick={() => setShowPwConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#9aa1b3" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#1d2c4e")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#9aa1b3")}
            >
              <EyeIcon />
            </button>
          </div>

          {/* 역할 */}
          <label style={labelStyle}>역할</label>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {ROLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                style={{
                  padding: "10px 0",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: role === value ? 700 : 500,
                  border: `1.5px solid ${role === value ? "#1d2c4e" : "#d9deea"}`,
                  background: role === value ? "#1d2c4e" : "#fff",
                  color: role === value ? "#fff" : "#6b7388",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 에러 */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm text-center" style={{ background: "#fff1f1", color: "#c0392b", border: "1px solid #fcd5d5" }}>
              {error}
            </div>
          )}

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
              marginBottom: 14,
            }}
            onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = "#2b3f6c"; }}
            onMouseLeave={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = "#1d2c4e"; }}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                가입 중...
              </>
            ) : "회원가입"}
          </button>

          {/* 로그인 링크 */}
          <p className="text-center" style={{ fontSize: 13.5, color: "#6b7388" }}>
            이미 계정이 있으신가요?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-bold hover:underline"
              style={{ color: "#1d2c4e", background: "none", border: "none", cursor: "pointer" }}
            >
              로그인
            </button>
          </p>
        </form>

        <p className="w-full text-center" style={{ fontSize: 13, color: "#8a93a8" }}>
          비식별 엔진은 안전하고 신뢰할 수 있는 데이터 처리를 지향합니다.
        </p>
      </div>
    </div>
  );
}
