import Image from "next/image";

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  icon: string;
}

export default function StatCard({ label, value, unit, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg px-[25px] py-[34px] flex items-center justify-between shadow-sm">
      <div className="flex flex-col gap-3">
        <span className="text-sm text-[#8492a6]">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[32px] font-black text-[#003478] leading-none">
            {value}
          </span>
          <span className="text-sm text-[#8492a6]">{unit}</span>
        </div>
      </div>
      <Image
        src={icon}
        alt={label}
        width={600}
        height={600}
        className="w-auto h-[45px]"
      />
    </div>
  );
}
