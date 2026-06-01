"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from "recharts";
import { Folder, FileUp, Share2, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GetDashboardStats, GetCases, type DashboardStats, type CaseResponse } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const CATEGORY_LABEL: Record<string, string> = {
  photo: "현장사진",
  evidence: "증거자료",
  other: "기타",
};

const CATEGORY_COLOR: Record<string, string> = {
  photo: "#4f7cff",
  evidence: "#1d2c4e",
  other: "#9aa1b3",
};

const PIE_COLORS = ["#4f7cff", "#1d2c4e", "#9aa1b3", "#f5a623", "#e63946"];

const STATUS_MAP: Record<string, { label: string; style: string }> = {
  OPEN:         { label: "진행중", style: "bg-[#dceaf7] text-[#1f5a8f]" },
  UNDER_REVIEW: { label: "검토중", style: "bg-[#e5e8f0] text-[#4a5168]" },
  CLOSED:       { label: "사건종료", style: "bg-[#f9dcdc] text-[#a3282b]" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color: string;
}) {
  return (
    <div className="bg-white border border-[#e6e8ef] rounded-[10px] p-[20px] flex flex-col gap-[10px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#6b7388]">{label}</span>
        <div className={cn("w-9 h-9 rounded-[8px] flex items-center justify-center", color)}>
          <Icon size={17} className="text-white" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[28px] font-extrabold text-[#1f2330] leading-none tracking-[-0.02em]">
          {value}
        </span>
        {sub && (
          <div className="flex items-center gap-1 mb-[2px]">
            {trend === "up" && <TrendingUp size={13} className="text-[#1f9d55]" />}
            {trend === "down" && <TrendingDown size={13} className="text-[#e63946]" />}
            <span className={cn(
              "text-[12px] font-medium",
              trend === "up" ? "text-[#1f9d55]" : trend === "down" ? "text-[#e63946]" : "text-[#9aa1b3]",
            )}>
              {sub}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { email } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cases, setCases] = useState<CaseResponse[]>([]);
  const [sharedCount, setSharedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, casesData, sharedData] = await Promise.all([
          GetDashboardStats(),
          GetCases(0, 10, "ALL"),
          GetCases(0, 1, "SHARED"),
        ]);
        setStats(statsData);
        setCases(casesData.content);
        setSharedCount(sharedData.totalElements ?? 0);
      } catch {
        // 개별 실패는 빈 상태로 처리
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const openCount = cases.filter((c) => c.status === "OPEN" && c.accessType === "OWNED").length;
  const closedCount = cases.filter((c) => c.status === "CLOSED" && c.accessType === "OWNED").length;

  const uploadDiff = stats
    ? stats.todayUploadCount - stats.yesterdayUploadCount
    : 0;
  const uploadTrend = uploadDiff > 0 ? "up" : uploadDiff < 0 ? "down" : "neutral";
  const uploadSub = uploadDiff === 0
    ? "어제와 동일"
    : `어제보다 ${Math.abs(uploadDiff)}개 ${uploadDiff > 0 ? "증가" : "감소"}`;

  const recentCases = cases.slice(0, 6);

  const weeklyData = stats?.weeklyUploads.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    현장사진: d.photo,
    증거자료: d.evidence,
    기타: d.other,
  })) ?? [];

  const pieData = stats?.categoryDistribution.map((d) => ({
    name: CATEGORY_LABEL[d.category] ?? d.category,
    value: d.count,
    percentage: d.percentage,
  })) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[#9aa1b3] text-[14px]">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="pb-10">
      <h1 className="text-[32px] font-extrabold text-[#1f2330] tracking-[-0.02em] mb-2">
        대시보드
      </h1>
      <p className="text-[14.5px] text-[#6b7388] mb-[28px]">
        사건 및 파일 업로드 현황을 한눈에 확인하세요.
      </p>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-[18px] mb-[22px]">
        <StatCard
          icon={Folder}
          label="진행중 사건"
          value={openCount}
          sub="현재 처리 중"
          trend="neutral"
          color="bg-[#4f7cff]"
        />
        <StatCard
          icon={Folder}
          label="종료된 사건"
          value={closedCount}
          sub="사건 종료"
          trend="neutral"
          color="bg-[#1d2c4e]"
        />
        <StatCard
          icon={FileUp}
          label="오늘 업로드"
          value={stats?.todayUploadCount ?? 0}
          sub={uploadSub}
          trend={uploadTrend}
          color="bg-[#1f9d55]"
        />
        <StatCard
          icon={Share2}
          label="공유받은 사건"
          value={sharedCount}
          sub={stats?.lastUploadedAt ? `최근 ${stats.lastUploadedAt.slice(5, 16)}` : undefined}
          trend="neutral"
          color="bg-[#f5a623]"
        />
      </div>

      {/* 차트 행 */}
      <div className="grid grid-cols-5 gap-[18px] mb-[22px]">
        {/* 주간 업로드 추이 */}
        <div className="col-span-3 bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
          <h2 className="text-[15px] font-bold text-[#1f2330] mb-[18px]">
            최근 7일 파일 업로드 추이
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barSize={12} barGap={4}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9aa1b3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9aa1b3" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e6e8ef", fontSize: 12 }}
                cursor={{ fill: "#f7f8fb" }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: "#6b7388", paddingTop: 12 }}
              />
              <Bar dataKey="현장사진" fill="#4f7cff" radius={[3, 3, 0, 0]} />
              <Bar dataKey="증거자료" fill="#1d2c4e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="기타" fill="#c5cbd9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 카테고리 분포 */}
        <div className="col-span-2 bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
          <h2 className="text-[15px] font-bold text-[#1f2330] mb-[18px]">
            카테고리 분포
          </h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-[#9aa1b3] text-[13px]">
              업로드된 파일이 없습니다.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip
                    formatter={(value, name) => [`${value}개`, name]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e6e8ef", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-[6px] mt-[10px]">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-[12.5px]">
                    <div className="flex items-center gap-[6px]">
                      <span className="w-[8px] h-[8px] rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[#6b7388]">{d.name}</span>
                    </div>
                    <span className="font-semibold text-[#1f2330]">{d.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 최근 사건 + 새 사건 생성 */}
      <div className="grid grid-cols-4 gap-[18px] items-start">

      {/* 최근 사건 목록 */}
      <div className="col-span-3 bg-white border border-[#e6e8ef] rounded-[10px] p-[22px]">
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[15px] font-bold text-[#1f2330]">최근 사건</h2>
          <button
            onClick={() => router.push("/cases")}
            className="text-[12.5px] font-semibold text-[#4f7cff] hover:underline"
          >
            전체보기 →
          </button>
        </div>

        {recentCases.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[#9aa1b3]">
            등록된 사건이 없습니다.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["사건번호", "사건명", "상태", "파일 수", "담당자", "날짜"].map((h) => (
                  <th key={h} className="text-left text-[12px] font-semibold text-[#9aa1b3] pb-[10px] border-b border-[#eef0f5]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentCases.map((c) => {
                const st = STATUS_MAP[c.status];
                return (
                  <tr
                    key={c.caseId}
                    className="hover:bg-[#f7f8fb] cursor-pointer transition-colors"
                    onClick={() => router.push(`/cases/${c.caseId}`)}
                  >
                    <td className="py-[11px] border-b border-[#f0f1f5] text-[12.5px] text-[#9aa1b3] font-medium">
                      # {c.caseNumber}
                    </td>
                    <td className="py-[11px] border-b border-[#f0f1f5] text-[13.5px] font-semibold text-[#1f2330] max-w-[200px]">
                      <span className="truncate block" title={c.title}>{c.title}</span>
                    </td>
                    <td className="py-[11px] border-b border-[#f0f1f5]">
                      <span className={cn("text-[11.5px] font-bold px-[8px] py-[3px] rounded-full", st?.style ?? "bg-[#e5e8f0] text-[#4a5168]")}>
                        {st?.label ?? c.status}
                      </span>
                    </td>
                    <td className="py-[11px] border-b border-[#f0f1f5] text-[13px] text-[#6b7388]">
                      {c.fileCount}개
                    </td>
                    <td className="py-[11px] border-b border-[#f0f1f5] text-[13px] text-[#6b7388] max-w-[120px]">
                      <span className="truncate block">{c.assignedTo ?? c.createdBy}</span>
                    </td>
                    <td className="py-[11px] border-b border-[#f0f1f5] text-[12.5px] text-[#9aa1b3]">
                      {(c.occurredAt ?? c.createdAt).slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 새 사건 생성 블록 */}
      <div className="col-span-1 bg-white border border-[#e6e8ef] rounded-[10px] p-[22px] flex flex-col gap-[16px]">
        <div>
          <h2 className="text-[15px] font-bold text-[#1f2330] mb-[6px]">새 사건 생성</h2>
          <p className="text-[12.5px] text-[#9aa1b3] leading-[1.6]">
            새로운 사건을 등록하고 관련 파일을 업로드하세요.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-[18px]">
          <div className="w-[64px] h-[64px] rounded-full bg-[#eef1f8] flex items-center justify-center">
            <Folder size={28} className="text-[#1d2c4e]" />
          </div>
        </div>

        <div className="flex flex-col gap-[8px]">
          <button
            onClick={() => router.push("/cases/new")}
            className="w-full py-[11px] bg-[#1d2c4e] text-white text-[13.5px] font-bold rounded-[8px] hover:bg-[#2b3f6c] transition-colors"
          >
            + 새 사건 생성
          </button>
        </div>
      </div>

      </div>
    </div>
  );
}
