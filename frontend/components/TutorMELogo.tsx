import Image from "next/image";

export default function TutorMELogo({ inverse = false }: { inverse?: boolean }) {
  return <span className="inline-flex shrink-0 items-center gap-2.5">
    <Image src="/brand/tutorme-mark.svg" alt="" width={36} height={36} />
    <span className={`text-2xl font-semibold tracking-tight ${inverse ? "text-white" : "text-slate-900"}`}>
      tutor<span className={`font-bold ${inverse ? "text-blue-300" : "text-blue-700"}`}>ME</span>
    </span>
  </span>;
}
